package com.brm.Kubotz.Features.GameRules.Systems;

import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Common.Events.DamageTakenEvent;
import com.brm.Kubotz.Features.GameRules.Components.PlayerScoreComponent;
import com.brm.Kubotz.Features.GameRules.Events.PlayerDeadEvent;
import com.brm.Kubotz.Features.GameRules.Events.PlayerEliminatedEvent;
import com.brm.Kubotz.Features.GameRules.Events.PlayerKillEvent;
import com.brm.Kubotz.Features.Respawn.Components.RespawnComponent;

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
        if(getEntityManager().getComponents(PlayerScoreComponent.ID).size() == 1){

            Logger.log("WE HAVE A WIIIIIINNNNER! GAME!");
        }
        // TODO Code
        // if playersNotEliminatedList.size == 1
            // WE HAVE A WINNER! stop the current game
    }


    @Override
    public <T extends Event> void onEvent(T event) {
        if(event.getClass() == DamageTakenEvent.class){
            onDamageTaken((DamageTakenEvent)event);
        }

        if(event.getClass() == PlayerDeadEvent.class){
           onPlayerDead((PlayerDeadEvent)event);
        }

        if(event.getClass() == PlayerKillEvent.class){
            onPlayerKill((PlayerKillEvent)event);
        }

    }

    private void onDamageTaken(DamageTakenEvent e) {

        HealthComponent healthComponent;
        healthComponent = (HealthComponent) getEntityManager().getEntity(e.getEntityId()).getComponent(HealthComponent.ID);

        if(healthComponent.isDead()){
            fireEvent(new PlayerDeadEvent(e.getEntityId()));
            fireEvent(new PlayerKillEvent(e.getAttackerId()));
        }
    }

    /**
     * Called when a player dies
     * @param e the event triggered
     */
    public void onPlayerDead(PlayerDeadEvent e){
        PlayerScoreComponent playerScores;
        playerScores = (PlayerScoreComponent) getEntityManager().getComponent(PlayerScoreComponent.ID, e.getEntityId());

        playerScores.addDeath(1);
        Logger.log("DEAD!" + String.valueOf(playerScores.getNbLives()));


        if(playerScores.getNbLives() == 0){

            Entity entity = getEntityManager().getEntity(e.getEntityId());
            // TODO remove the respawn component
            entity.removeComponent(RespawnComponent.ID);

            getEntityManager().deleteEntity(entity.getID());

            this.fireEvent(new PlayerEliminatedEvent(entity.getID()));
        }


    }


    /**
     * Called when a player kills another player
     * @param e the event triggered
     */
    public void onPlayerKill(PlayerKillEvent e){
        PlayerScoreComponent playerScores;
        playerScores = (PlayerScoreComponent) getEntityManager().getComponent(PlayerScoreComponent.ID, e.getEntityId());
        if(playerScores != null)
            playerScores.addKills(1);
        //else it is something like a bullet that kill the player

    }





}
