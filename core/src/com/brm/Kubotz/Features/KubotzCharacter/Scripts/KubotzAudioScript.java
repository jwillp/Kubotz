package com.brm.Kubotz.Features.KubotzCharacter.Scripts;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.audio.Sound;
import com.badlogic.gdx.utils.GdxRuntimeException;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityManager;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.ScriptingEngine.EntityScript;
import com.brm.Kubotz.Common.Events.DamageTakenEvent;
import com.brm.Kubotz.Features.LaserGuns.Events.GunShotEvent;
import com.brm.Kubotz.Features.MeleeAttacks.Events.PunchEvent;

/**
 * Plays the audio for Kubotz
 */
public class KubotzAudioScript extends EntityScript {
    /**
     * Called every frame
     *
     * @param entity        the entity to update with the script
     * @param entityManager
     */
    @Override
    public void onUpdate(Entity entity, EntityManager entityManager) {

    }

    @Override
    public <T extends EntityEvent> void onEvent(T event, Entity entity) {
        if(event.isOfType(PunchEvent.class)){


        }

        if(event.isOfType(GunShotEvent.class)){
            playSound("audio/layzer.wav");
        }


        if(event.isOfType(DamageTakenEvent.class)){
            playSound("audio/HeavyPunch2.wav");
        }

    }




    public void playSound(String soundPath){
        try{
            Sound sound = Gdx.audio.newSound(Gdx.files.internal(soundPath));
            sound.play();
        }catch (GdxRuntimeException e){
            // No sound played
        }

    }







}
