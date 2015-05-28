package com.brm.Kubotz.Components;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.graphics.g2d.ParticleEffect;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.EntityComponent;


/**
 * Used to emit particles from that entity's position
 */
public class ParticleEffectComponent extends EntityComponent{

    public static String ID = "PARTICLE_EMITTER_COMPONENT";

    private ParticleEffect particleEffect = new ParticleEffect();
    private boolean isLooping = false;

    public ParticleEffectComponent(FileHandle particle, Vector2 pos, boolean startNow){
        particleEffect.load(particle, Gdx.files.internal(""));
        particleEffect.setPosition(pos.x, pos.y);
        if(startNow){
            particleEffect.start();
        }
    }


    public ParticleEffectComponent(FileHandle particle, Vector2 pos){
       this(particle, pos, false);
    }


    public ParticleEffect getEffect() {
        return particleEffect;
    }

    public boolean isLooping() {
        return isLooping;
    }

    public void setLooping(boolean isLooping) {
        this.isLooping = isLooping;
    }
}
