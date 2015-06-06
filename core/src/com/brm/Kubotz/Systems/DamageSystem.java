package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.DamageComponent;
import com.brm.Kubotz.Components.Powerups.EnergeticShieldComponent;
import com.brm.Kubotz.Components.Powerups.InvincibilityComponent;
import com.brm.Kubotz.Events.CollisionEvent;
import com.brm.Kubotz.Events.TakeDamageEvent;

/**
 * Used to deal damage and process Health Bonuses
 */
public class DamageSystem extends EntitySystem{


    public DamageSystem() {
    }

    @Override
    public void init() {}


    @Override
    public void update(float dt){
        // TODO ON GOING DAMAGE ? LIKE BURNING
    }


    @Override
    public <T extends Event> void onEvent(T event) {
        if(event.getClass() == TakeDamageEvent.class){
            onTakeDamage((TakeDamageEvent) event);
        }
    }

    /**
     * Listens to take damage events.
     * Tries to apply damage according
     * to the situation and the data
     * provided by the event
     * @param e
     */
    private void onTakeDamage(TakeDamageEvent e){
        Entity target = getEntityManager().getEntity(e.getEntityId());
        if(!target.hasComponent(HealthComponent.ID) ||target.hasComponent(InvincibilityComponent.ID) ){
            return;
        }

        PhysicsComponent targetPhys = (PhysicsComponent)target.getComponent(PhysicsComponent.ID);
        HealthComponent targetHealth = (HealthComponent)target.getComponent(HealthComponent.ID);

        //Damage Health

        //Energetic Shield
        if(target.hasComponent(EnergeticShieldComponent.ID)){
            EnergeticShieldComponent shield = (EnergeticShieldComponent) target.getComponent(EnergeticShieldComponent.ID);
            shield.takeDamage(e.getDamage());
            //Is shield dead? If so remove it
            if(shield.isDead()){
                target.removeComponent(EnergeticShieldComponent.ID);
                // TODO Shield Exploded Event?
            }
        }else{
            // There is no protection let's take that hit!
            targetHealth.substractAmount(e.getDamage());

            //KnockBack
            Vector2 knockBack = e.getKnockback().cpy();
            /*if(damagerPhys.getDirection() == PhysicsComponent.Direction.LEFT){
                knockBack.x *= -1;
            }*/
            targetPhys.getBody().applyLinearImpulse(knockBack.x, knockBack.y,
                    targetPhys.getPosition().x,
                    targetPhys.getPosition().y,
                    true);
        }
        Logger.log(targetHealth.getAmount());



        //Now is the target ... dead ?
        if(targetHealth.isDead()){

            // TODO Fire Event player dead
            // TODO Fire event player killed another player

        }

    }










}
