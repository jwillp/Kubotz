package com.brm.Kubotz.Features.Narrator.Systems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.audio.Sound;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.utils.GdxRuntimeException;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Features.GameRules.Components.PlayerScoreComponent;
import com.brm.Kubotz.Features.GameRules.Events.*;

/**
 * Handles the narrator voice over
 */
public class NarratorSystem extends EntitySystem {

    /**
     * Used to initialise the system
     */
    @Override
    public void init() {

    }

    /**
     * Called once per game frame
     *
     * @param dt
     */
    @Override
    public void update(float dt) {

    }

    @Override
    public <T extends EntityEvent> void onEvent(T event) {
        if(event.isOfType(CountdownEndEvent.class)){
            onCountdown((CountdownEndEvent) event);
        }


        if(event.isOfType(GameStartedEvent.class)){
            playSound("audio/narrator_fight.mp3");
        }


        if(event.isOfType(PlayerDeadEvent.class)){
          onPlayerDead((PlayerDeadEvent) event);
        }

        if(event.isOfType(PlayerEliminatedEvent.class)){
            onPlayerEliminated((PlayerEliminatedEvent) event);
        }

        if(event.isOfType(GameWinEvent.class)){
            playSound("audio/narrator_game.mp3");
        }


    }


    public void onCountdown(CountdownEndEvent e){
        switch (e.getTimeRemaining()) {
            case 3:
                playSound("audio/narrator_3.mp3");
                break;

            case 2:
                playSound("audio/narrator_2.mp3");
                break;

            case 1:
                playSound("audio/narrator_1.mp3");
                break;
        }
    }


    public void onPlayerEliminated(PlayerEliminatedEvent e){
        PlayerScoreComponent player;
        /*player = (PlayerScoreComponent) getEntityManager().getEntity(e.getEntityId()).getComponent(PlayerScoreComponent.ID);
        switch (player.getPlayerId()) {
            case PlayerScoreComponent.PLAYER_1:
                playSound("audio/narrator_player1_defeated.mp3");
                break;
            case PlayerScoreComponent.PLAYER_2:
                playSound("audio/narrator_player2_defeated.mp3");
                break;
            case PlayerScoreComponent.PLAYER_CPU:
                playSound("audio/narrator_cpu_defeated.mp3");
                break;
        }*/
    }



    public void onPlayerDead(PlayerDeadEvent e){
        int rand = MathUtils.random(0,2);
        switch (rand) {
            case 0:
                playSound("audio/narrator_goodKill.mp3");
                break;
            case 1:
                playSound("audio/narrator_niceShot.mp3");
                break;
            case 2:
                playSound("audio/narrator_great.mp3");
                break;
        }
    }





    public void playSound(String soundPath){
        try{
            Sound sound = Gdx.audio.newSound(Gdx.files.internal(soundPath));
            sound.play();
        }catch (GdxRuntimeException e){
            Logger.log(soundPath);
        }
    }






}
