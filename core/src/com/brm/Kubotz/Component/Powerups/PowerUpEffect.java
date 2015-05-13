package com.brm.Kubotz.Component.Powerups;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.ManaComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;

/**
 * The effect of a PowerUp. It is an action to perform
 * when a powerup is used
 */
public abstract class PowerUpEffect {

    /**
     * Called when the effect is STARTED
     * @param entity the entity on which to apply the effect
     */
    public abstract void onStart(Entity entity);

    /**
     * Called when the effect is FINISHED
     * @param entity the entity on which to apply the effect
     */
    public abstract void onFinish(Entity entity);


    //////////// MODIFIERS ///////////

    /**
     * Gives a Health bonus of 50%
     */
    public static class HealthModifier extends PowerUpEffect {


        private final float percentage = 50; //50%

        @Override
        public void onStart(Entity entity){
            HealthComponent health = (HealthComponent) entity.getComponent(HealthComponent.ID);
            health.addAmount(health.maxAmount * 1/this.percentage);
        }

        @Override
        public void onFinish(Entity entity){}
    }

    /**
     * Gives an Energy Boost of 50%
     */
    public static class EnergyModifier extends PowerUpEffect {

        private final float percentage = 50; //50%

        public EnergyModifier(){
        }

        @Override
        public void onStart(Entity entity){
            ManaComponent energy = (ManaComponent) entity.getComponent(ManaComponent.ID);
            energy.addAmount(energy.maxAmount * 1/this.percentage);
        }

        @Override
        public void onFinish(Entity entity) {}
    }


    /**
     * A Speed Boost for an entity's walking speed and Jump Speed
     * of 10%
     */
    public static class SpeedModifier extends PowerUpEffect {

        public final float percentage = 10; //10%
        public Vector2 oldSpeed;

        @Override
        public void onStart(Entity entity){
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            this.oldSpeed = phys.getAcceleration().cpy();

            phys.getAcceleration().add(
                    phys.getAcceleration().x * 1/this.percentage,
                    phys.getAcceleration().y * 1/this.percentage
            );
        }

        @Override
        public void onFinish(Entity entity){
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            phys.getAcceleration().set(oldSpeed);
        }
    }


    /**
     * Adds a +1 Jump to the jump component of an entity
     */
    public static class JumpModifier extends PowerUpEffect{

        @Override
        public void onStart(Entity entity) {
            JumpComponent jump = (JumpComponent) entity.getComponent(JumpComponent.ID);
            jump.setNbJumpsMax(jump.getNbJumpsMax()+1);
        }

        @Override
        public void onFinish(Entity entity) {
            JumpComponent jump = (JumpComponent) entity.getComponent(JumpComponent.ID);
            jump.setNbJumpsMax(jump.getNbJumpsMax()-1);
        }
    }





    //////////////// PROVIDERS //////////////////////

    /**
     * Makes an entity invincible (does not take any damage)
     */
    public class InvicibilityProvider extends PowerUpEffect{

        @Override
        public void onStart(Entity entity) {
            entity.addComponent(new InvincibilityComponent(), InvincibilityComponent.ID);
        }

        @Override
        public void onFinish(Entity entity) {
            entity.removeComponent(InvincibilityComponent.ID);
        }
    }

    /**
     * Gives a shield to an entity absorbing damage
     */
    public class ShieldProvider extends PowerUpEffect{

        @Override
        public void onStart(Entity entity) {
            entity.addComponent(new EnergeticShieldComponent(), EnergeticShieldComponent.ID);
        }

        @Override
        public void onFinish(Entity entity) {
            //Shield will be deleted from entity when it dies
        }
    }

    /**
     * Makes an Entity invisible (usually for sometime)
     */
    public class InvisibilityProvider extends PowerUpEffect{

        @Override
        public void onStart(Entity entity) {
            entity.addComponent(new InvisibilityComponent(), InvisibilityComponent.ID);
        }

        @Override
        public void onFinish(Entity entity) {
            entity.removeComponent(InvisibilityComponent.ID);
        }
    }


}
