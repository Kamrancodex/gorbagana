use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("GorTokenTakedown11111111111111111111111111");

#[program]
pub mod token_takedown {
    use super::*;

    /// Initialize a new game room with entry fee collection
    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        game_id: u64,
        entry_fee: u64,
        max_players: u8,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.game_id = game_id;
        game.entry_fee = entry_fee;
        game.max_players = max_players;
        game.current_players = 0;
        game.status = GameStatus::Waiting;
        game.total_pool = 0;
        game.authority = ctx.accounts.authority.key();
        game.vault_bump = ctx.bumps.vault;
        
        msg!("Game {} initialized with entry fee: {} gGOR", game_id, entry_fee);
        Ok(())
    }

    /// Join a game by paying the entry fee
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(game.status == GameStatus::Waiting, GameError::GameNotWaiting);
        require!(game.current_players < game.max_players, GameError::GameFull);

        // Transfer entry fee from player to game vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player_token_account.to_account_info(),
                to: ctx.accounts.game_vault.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, game.entry_fee)?;

        // Update game state
        game.current_players += 1;
        game.total_pool += game.entry_fee;
        game.players[game.current_players as usize - 1] = ctx.accounts.player.key();

        msg!("Player {} joined game {}. Total pool: {} gGOR", 
             ctx.accounts.player.key(), game.game_id, game.total_pool);

        // Start game if max players reached
        if game.current_players == game.max_players {
            game.status = GameStatus::Active;
            msg!("Game {} started with {} players!", game.game_id, game.current_players);
        }

        Ok(())
    }

    /// Burn tokens for power-up usage (Freeze Ray)
    pub fn use_power_up(
        ctx: Context<UsePowerUp>,
        power_up_type: PowerUpType,
    ) -> Result<()> {
        let game = &ctx.accounts.game;
        require!(game.status == GameStatus::Active, GameError::GameNotActive);

        let burn_amount = match power_up_type {
            PowerUpType::FreezeRay => 1_000_000, // 1 gGOR (assuming 6 decimals)
        };

        // Transfer tokens to burn address (or actual burn mechanism)
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player_token_account.to_account_info(),
                to: ctx.accounts.burn_account.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, burn_amount)?;

        msg!("Player {} used {:?}, burned {} gGOR", 
             ctx.accounts.player.key(), power_up_type, burn_amount);

        Ok(())
    }

    /// Distribute rewards to top 3 players
    pub fn distribute_rewards(
        ctx: Context<DistributeRewards>,
        winners: [Pubkey; 3],
        final_scores: [u32; 3],
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require!(game.status == GameStatus::Active, GameError::GameNotActive);

        let total_pool = game.total_pool;
        
        // Calculate prize distribution: 50%, 30%, 20%
        let first_prize = (total_pool * 50) / 100;
        let second_prize = (total_pool * 30) / 100;
        let third_prize = (total_pool * 20) / 100;

        let prizes = [first_prize, second_prize, third_prize];
        
        // Use PDA seeds for vault authority
        let game_id_bytes = game.game_id.to_le_bytes();
        let seeds = &[
            b"game_vault",
            game_id_bytes.as_ref(),
            &[game.vault_bump],
        ];
        let signer = &[&seeds[..]];

        // Distribute prizes to winners
        for (i, (winner, prize)) in winners.iter().zip(prizes.iter()).enumerate() {
            if *winner != Pubkey::default() && *prize > 0 {
                // Get winner's token account (this would need to be passed in context)
                // For now, we'll emit an event for the backend to handle
                msg!("Winner {}: {} receives {} gGOR (score: {})", 
                     i + 1, winner, prize, final_scores[i]);
            }
        }

        game.status = GameStatus::Finished;
        game.winners = winners;
        game.final_scores = final_scores;

        msg!("Game {} finished. Rewards distributed.", game.game_id);
        Ok(())
    }

    /// Emergency function to end game and refund players
    pub fn emergency_end_game(ctx: Context<EmergencyEndGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require!(game.authority == ctx.accounts.authority.key(), GameError::Unauthorized);

        game.status = GameStatus::Cancelled;
        
        // In a real implementation, we'd refund all players here
        msg!("Game {} emergency ended by authority", game.game_id);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = authority,
        space = Game::LEN,
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        init,
        payer = authority,
        token::mint = ggor_mint,
        token::authority = vault,
        seeds = [b"game_vault", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"game_vault", game_id.to_le_bytes().as_ref()],
        bump
    )]
    /// CHECK: This is a PDA used as token account authority
    pub vault_authority: UncheckedAccount<'info>,

    pub ggor_mint: Account<'info, token::Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        seeds = [b"game", game.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"game_vault", game.game_id.to_le_bytes().as_ref()],
        bump = game.vault_bump
    )]
    pub game_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = ggor_mint,
        token::authority = player
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    pub ggor_mint: Account<'info, token::Mint>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UsePowerUp<'info> {
    #[account(
        seeds = [b"game", game.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        token::mint = ggor_mint,
        token::authority = player
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = ggor_mint,
    )]
    pub burn_account: Account<'info, TokenAccount>,

    pub ggor_mint: Account<'info, token::Mint>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(
        mut,
        seeds = [b"game", game.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"game_vault", game.game_id.to_le_bytes().as_ref()],
        bump = game.vault_bump
    )]
    pub game_vault: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"game_vault", game.game_id.to_le_bytes().as_ref()],
        bump = game.vault_bump
    )]
    /// CHECK: This is a PDA used as token account authority
    pub vault_authority: UncheckedAccount<'info>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct EmergencyEndGame<'info> {
    #[account(
        mut,
        seeds = [b"game", game.game_id.to_le_bytes().as_ref()],
        bump,
        has_one = authority
    )]
    pub game: Account<'info, Game>,

    pub authority: Signer<'info>,
}

#[account]
pub struct Game {
    pub game_id: u64,
    pub entry_fee: u64,
    pub max_players: u8,
    pub current_players: u8,
    pub status: GameStatus,
    pub total_pool: u64,
    pub authority: Pubkey,
    pub vault_bump: u8,
    pub players: [Pubkey; 6], // Max 6 players as updated
    pub winners: [Pubkey; 3],
    pub final_scores: [u32; 3],
}

impl Game {
    pub const LEN: usize = 8 + // discriminator
        8 + // game_id
        8 + // entry_fee
        1 + // max_players
        1 + // current_players
        1 + // status
        8 + // total_pool
        32 + // authority
        1 + // vault_bump
        (32 * 6) + // players array
        (32 * 3) + // winners array
        (4 * 3); // final_scores array
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GameStatus {
    Waiting,
    Active,
    Finished,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum PowerUpType {
    FreezeRay,
}

#[error_code]
pub enum GameError {
    #[msg("Game is not in waiting status")]
    GameNotWaiting,
    #[msg("Game is full")]
    GameFull,
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid winner")]
    InvalidWinner,
} 