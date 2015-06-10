package com.brm.Kubotz.Systems.GameRules;

import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.Kubotz.Components.PlayerScoreComponent;
import com.brm.Kubotz.Events.PlayerDeadEvent;
import com.brm.Kubotz.Events.PlayerEliminatedEvent;
import com.brm.Kubotz.Events.PlayerKillEvent;

/**
 * RULE: Players all start with a certain amount of lives.
 * When they die, that number decrements until 0 at which point
 * the player is eliminated and can no longer play for the current game
 *
 * The system waits for the very last player standing, and establish her/him as
 * the winner.
 */
public class LifeBasedFreeForAll extends EntitySystem {
    /**
     * Used to initialise the system
     */
    @Override
    public void init(){}

    /**
     * Called once per game frame
     *
     * @param dt
     */
    @Override
    public void update(float dt) {

        for(Entity entity : getEntityManager().getEntitiesWithComponentEnabled(PlayerScoreComponent.ID)){
            PlayerScoreComponent score = (PlayerScoreComponent) entity.getComponent(PlayerScoreComponent.ID);
            if(score.getNbLives() == 0){
                this.fireEvent(new PlayerEliminatedEvent(entity.getID()));
            }
        }
        // TODO Code
        // if playersNotEliminatedList.size == 1
            // WE HAVE A WINNER! stop the current game
    }


    @Override
    public <T extends Event> void onEvent(T event) {
        super.onEvent(event);
    }

    /**
     * Called when a player dies
     * @param e the event triggered
     */
    public void onPlayerDead(PlayerDeadEvent e){
        PlayerScoreComponent playerScores;
        playerScores = (PlayerScoreComponent) getEntityManager().getComponent(PlayerScoreComponent.ID, e.getEntityId());
        playerScores.addDeath(1);
    }


    /**
     * Called when a player kills another player
     * @param e the event triggered
     */
    public void onPlayerKill(PlayerKillEvent e){
        PlayerScoreComponent playerScores;
        playerScores = (PlayerScoreComponent) getEntityManager().getComponent(PlayerScoreComponent.ID, e.getEntityId());
        playerScores.addKills(1);
    }





}
