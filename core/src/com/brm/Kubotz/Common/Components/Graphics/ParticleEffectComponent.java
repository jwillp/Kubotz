package com.brm.Kubotz.Common.Components.Graphics;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.Utils.GParticleEffect;

import java.util.ArrayList;


/**
 * Used to emit particles from that entity's position
 */
public class ParticleEffectComponent extends EntityComponent{

    public static String ID = "PARTICLE_EMITTER_COMPONENT";

    private ArrayList<GParticleEffect> effects = new ArrayList<GParticleEffect>();

    private float alpha = 1;


    /**
     * Adds a new Particle effect to the list
     * @param particle
     * @param pos
     * @param startNow
     */
    public void addEffect(FileHandle particle, Vector2 pos, boolean startNow){
        GParticleEffect effect = new GParticleEffect();
        effect.load(particle, Gdx.files.internal("particles/"));
        effect.setPosition(pos.x, pos.y);
        if(startNow){
            effect.start();
        }
        effects.add(effect);
    }

    /**
     * Adds a new particle effect starting right away
     * @param particle
     * @param pos
     */
    public void addEffect(FileHandle particle, Vector2 pos){
       addEffect(particle, pos, true);
    }


    public ArrayList<GParticleEffect> getEffects() {
        return effects;
    }


    public float getAlpha() {
        return alpha;
    }

    public void setAlpha(float alpha) {
        this.alpha = alpha;
    }

    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }
}
