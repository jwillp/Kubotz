package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.DamageComponent;
import com.brm.Kubotz.Components.Powerups.EnergeticShieldComponent;
import com.brm.Kubotz.Components.Powerups.InvincibilityComponent;

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
        //Process collisions
        /*for(Entity e: getEntityManager().getEntitiesWithComponent(DamageComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent) e.getComponent(PhysicsComponent.ID);

            for(int i=0; i< phys.getContacts().size(); i++){
                EntityContact contact = phys.getContacts().get(i);
                //The the other entity can be Hit handle damage
                if(contact.getEntityB().hasComponent(HealthComponent.ID)){

                    //Only hit the torso //TODO this is a quick fix (hack) to prevent 3 fixture damamge
                    if(contact.fixtureB.getUserData().equals(Constants.FIXTURE_TORSO)){
                        handleDamage(contact.getEntityA(), contact.getEntityB());
                        //REMOVE CONTACTS
                        phys.getContacts().remove(i);
                        PhysicsComponent physB = (PhysicsComponent) contact.getEntityB().getComponent(PhysicsComponent.ID);
                        physB.getContacts().remove(contact);
                    }
                }
            }
        }*/
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
        //Invinvible
        if(target.hasComponent(InvincibilityComponent.ID)){
            return;
        }//Energetic Shield
        else if(target.hasComponent(EnergeticShieldComponent.ID)){
            EnergeticShieldComponent shield = (EnergeticShieldComponent) target.getComponent(EnergeticShieldComponent.ID);
            shield.takeDamage(damageComp.getDamage());

            //Is shield dead? If so remove it
            if(shield.isDead()){
                target.removeComponent(EnergeticShieldComponent.ID);
            }
        }else{
            targetHealth.substractAmount(damageComp.getDamage());

            //KnockBack
            Vector2 knockBack = damageComp.getKnockBack().cpy();
            if(damagerPhys.getDirection() == PhysicsComponent.Direction.LEFT){
                knockBack.x *= -1;
            }

            targetPhys.getBody().applyLinearImpulse(knockBack.x, knockBack.y,
                    targetPhys.getPosition().x,
                    targetPhys.getPosition().y,
                    true);

        }
        Logger.log(targetHealth.getAmount());
    }






}
