package com.brm.Kubotz.Common.Systems.AttackSystems;

import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.ECS.common.HealthComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Math.GameMath;
import com.brm.Kubotz.Common.Components.StunnedComponent;
import com.brm.Kubotz.Common.Events.*;
import com.brm.Kubotz.Features.PowerUps.Components.EnergeticShieldComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Common.Hitbox.Hitbox;

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


        //STUNNED ENTITIES
        for(Entity entity: getEntityManager().getEntitiesWithComponentEnabled(StunnedComponent.ID)){
            StunnedComponent stunnedComponent = (StunnedComponent) entity.getComponent(StunnedComponent.ID);
            if(stunnedComponent.getDuration().isDone()){
                entity.removeComponent(StunnedComponent.ID);
                entity.enableComponent(VirtualGamePad.ID);

                fireEvent(new StunnedFinishedEvent(entity.getID()));
            }

        }

    }


    @Override
    public <T extends EntityEvent> void onEntityEvent(T event) {
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
            if(event.getEntityB() == null){
                return;
            }

            Hitbox hitboxB = (Hitbox) event.getFixtureB().getUserData();
            TakeDamageEvent tkDmgEv;

            tkDmgEv = new TakeDamageEvent(event.getEntityB(),
                    hitboxB,
                    event.getEntityA(),
                    hitboxA,
                    hitboxA.knockback
            );

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

        //We cant hit stunned entities
        if(targetEntity.hasComponentEnabled(StunnedComponent.ID)){
            return;
        }

        //We take for granted that, the damager Hitbox is of type Offensive

        //Offensive + Offensive //TODO Sometimes the body get destroyed before getting here so HitBox does not exist anymore
        if(e.getTargetHitbox().type == Hitbox.Type.Offensive){
            if(GameMath.isMoreOrLess(e.getTargetHitbox().damage, e.getDamagerHitbox().damage, Constants.CLASH_THRESHOLD)){
                 // THERE IS A CLASH (NOT DAMAGE WILL BE TAKEN)
                //TODO SEND an Clash Event
                fireEvent(new ClashEvent(e.getEntityId(), e.getDamagerId()));
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

            //Apply knockback
            PhysicsComponent phys = (PhysicsComponent) targetEntity.getComponent(PhysicsComponent.ID);
            phys.getBody().applyLinearImpulse(e.getKnockback(), 0, 0, 0, true);


            //Stun the other player for a few seconds
            targetEntity.addComponent(new StunnedComponent(), StunnedComponent.ID);
            targetEntity.disableComponent(VirtualGamePad.ID);

            //Fire the Event
            this.fireEvent(new DamageTakenEvent(e.getEntityId(), e.getDamagerId()));
        }

        // Offensive + Shield
        if(e.getTargetHitbox().type == Hitbox.Type.Shield){
            // Give the damage to the shield
            EnergeticShieldComponent shield = (EnergeticShieldComponent) targetEntity.getComponent(EnergeticShieldComponent.ID);
            shield.takeDamage(e.getDamagerHitbox().damage);

            // HALF knockback applied //TODO move apply kockback in a separate function
            PhysicsComponent phys = (PhysicsComponent) targetEntity.getComponent(PhysicsComponent.ID);
            phys.getBody().applyLinearImpulse(e.getKnockback()/2, 0, 0, 0, true);


        }
    }










}
