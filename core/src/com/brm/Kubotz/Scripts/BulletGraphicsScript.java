package com.brm.Kubotz.Scripts;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.ParticleEffectComponent;

/**
 * Used to handle visual apsects of bullets
 */
public class BulletGraphicsScript extends EntityScript {

    public static int lol = 0;

    @Override
    public void onInit(Entity entity) {
        //addSmokeEffect(entity);

    }

    @Override
    public void onCollision(EntityContact contact) {
        addSmokeEffect(contact.getEntityA());
    }

    @Override
    public void onUpdate(Entity entity){}


    /**
     * Adds a particle effect looking like Smoke
     * @param bullet
     */
    private void addSmokeEffect(Entity bullet){
        PhysicsComponent phys = (PhysicsComponent) bullet.getComponent(PhysicsComponent.ID);
        ParticleEffectComponent pe = (ParticleEffectComponent) bullet.getComponent(ParticleEffectComponent.ID);
        // New Smoke effect

        if(pe.getEffects().size() <= 2){
            pe.addEffect(
                    Gdx.files.internal("particles/laserSmoke.pe"),
                    phys.getPosition(),
                    true
            );
        }



    }

}
