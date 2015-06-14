package com.brm.Kubotz.Features.GameRules.Systems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.audio.Music;
import com.badlogic.gdx.audio.Sound;
import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Common.Events.DamageTakenEvent;
import com.brm.Kubotz.Features.GameRules.Components.PlayerScoreComponent;
import com.brm.Kubotz.Features.GameRules.Events.*;
import com.brm.Kubotz.Features.Narrator.Systems.NarratorSystem;
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

    private Timer countdown = new Timer(Timer.ONE_SECOND);
    private int secondsRemaining = 4;



    /**
     * Used to initialise the system
     */
    @Override
    public void init(){

        /*Music music = Gdx.audio.newMusic(Gdx.files.internal("audio/TechnoTheme.ogg"));
        music.setLooping(true);
        music.play();*/

        getSystemManager().addSystem(NarratorSystem.class, new NarratorSystem());

        // We enable all game controllers
        for(EntityComponent comp: getEntityManager().getComponents(VirtualGamePad.ID)){
            comp.setEnabled(false);
        }

    }

    /**
     * Called once per game frame
     *
     * @param dt
     */
    @Override
    public void update(float dt) {

        updateCountdown();


        if(getEntityManager().getComponents(PlayerScoreComponent.ID).size() == 1){
            Logger.log("WE HAVE A WIIIIIINNNNER! GAME!");
            String winner = getEntityManager().getEntitiesWithComponent(PlayerScoreComponent.ID).get(0).getID();
            fireEvent(new GameWinEvent(winner));
        }

    }


    public void updateCountdown(){

        if(secondsRemaining > 0){
                if(countdown.isDone()){
                Logger.log( String.valueOf((--secondsRemaining))  + " SECONDS");
                countdown.reset();

                fireEvent(new CountdownEndEvent(secondsRemaining));

                if(secondsRemaining == 0){
                    fireEvent(new GameStartedEvent());
                }
            }
        }
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


    /**
     * Called when a player takes some damage
     * @param e
     */
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


    /**
     * Called when the game starts
     * @param e
     */
    public void onGameStart(GameStartedEvent e){

        // We enable all game controllers
        for(EntityComponent comp: getEntityManager().getComponents(VirtualGamePad.ID)){
            comp.setEnabled(true);
        }

    }










}
