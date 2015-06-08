package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Utils.GameMath;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.DamageComponent;
import com.brm.Kubotz.Components.Powerups.EnergeticShieldComponent;
import com.brm.Kubotz.Components.Powerups.InvincibilityComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Events.CollisionEvent;
import com.brm.Kubotz.Events.TakeDamageEvent;
import com.brm.Kubotz.Hitbox.Hitbox;

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
        }else if(event.getClass() == CollisionEvent.class){
            onCollision((CollisionEvent) event);
        }



    }

    private void onCollision(CollisionEvent event) {
        Hitbox hitboxA = (Hitbox) event.getFixtureA().getUserData();
        if(hitboxA == null){
            return;
        }
        if(hitboxA.type == Hitbox.Type.Offensive){
            Hitbox hitboxB = (Hitbox) event.getFixtureB().getUserData();
            TakeDamageEvent tkDmgEv;
            tkDmgEv = new TakeDamageEvent(event.getEntityB().getID(), hitboxB, event.getEntityA().getID(), hitboxA);
            this.fireEvent(tkDmgEv);
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
        Entity targetEntity = getEntityManager().getEntity(e.getEntityId());
        Entity damagerEntity = getEntityManager().getEntity(e.getDamagerId());

        //We take for granted that, the damager Hitbox is of type Offensive

        //Offensive + Offensive
        if(e.getTargetHitbox().type == Hitbox.Type.Offensive){
            if(GameMath.isMoreOrLess(e.getTargetHitbox().damage, e.getDamagerHitbox().damage, Constants.CLASH_THRESHOLD)){
                 // THERE IS A CLASH (NOT DAMAGE WILL BE TAKEN)
                //TODO SEND an Clash Event
                return;
            }
            //TODO decide if do the same as Damageable box OR diminish the lowest attack to the greatest (as a form of resistance)
        }

        // Offensive + Damageable
        if(e.getTargetHitbox().type == Hitbox.Type.Damageable){
            // TODO Actually take damage
            //Send an event damageTaken ? to let other system play animations and sounds?
            HealthComponent health = (HealthComponent) targetEntity.getComponent(HealthComponent.ID);
            health.substractAmount(e.getDamagerHitbox().damage);

            //Apply hitbox
            // TODO
        }

        // Offensive + Shield
        if(e.getTargetHitbox().type == Hitbox.Type.Shield){
            // Give the damage to the shield
            EnergeticShieldComponent shield = (EnergeticShieldComponent) targetEntity.getComponent(EnergeticShieldComponent.ID);
            shield.takeDamage(e.getDamagerHitbox().damage);

            // TODO Apply half of knockback?
        }
    }










}
