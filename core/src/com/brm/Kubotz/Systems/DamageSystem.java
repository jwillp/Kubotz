package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.DamageComponent;

/**
 * USed to deal damage and process Health Bonuses
 */
public class DamageSystem extends EntitySystem{


    public DamageSystem(EntityManager em) {
        super(em);
    }


    @Override
    public void update(float dt) {
        super.update(dt);
    }


    public void update(){
        //Process collisions
        for(Entity e: em.getEntitiesWithComponent(DamageComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent) e.getComponent(PhysicsComponent.ID);

            for(int i=0; i<phys.contacts.size(); i++){
                EntityContact contact = phys.contacts.get(i);
                //The the other entity can be Hit handle damage
                if(contact.getEntityB().hasComponent(HealthComponent.ID)){

                    handleDamage(contact.getEntityA(), contact.getEntityB());
                    //REMOVE CONTACTS
                    phys.contacts.remove(i);
                    PhysicsComponent physB = (PhysicsComponent) contact.getEntityB().getComponent(PhysicsComponent.ID);
                    physB.contacts.remove(contact);
                }
            }
        }
    }


    /**
     * Process damage between an entity and a target entity
     * @param damageAgent the entity dealing damage
     * @param target the entity receiving the damage
     */
    private void handleDamage(Entity damageAgent, Entity target){
        //Damager
        PhysicsComponent damagerPhys = (PhysicsComponent) damageAgent.getComponent(PhysicsComponent.ID);
        DamageComponent damageComp = (DamageComponent)damageAgent.getComponent(DamageComponent.ID);


        //Target
        PhysicsComponent targetPhys = (PhysicsComponent) target.getComponent(PhysicsComponent.ID);
        HealthComponent targetHealth = (HealthComponent) target.getComponent(HealthComponent.ID);


        //Damage Health


        targetHealth.substractAmount(damageComp.damage);
        Logger.log(targetHealth.getAmount());



        //KnockBack
        Vector2 knockBack = damageComp.knockBack.cpy();
        if(damagerPhys.direction == PhysicsComponent.Direction.LEFT){
            knockBack.x *= -1;
        }

        targetPhys.getBody().applyLinearImpulse(knockBack.x, knockBack.y,
                targetPhys.getPosition().x,
                targetPhys.getPosition().y,
                true);

    }










}
