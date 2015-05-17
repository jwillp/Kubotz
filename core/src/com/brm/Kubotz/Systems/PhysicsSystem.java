package com.brm.Kubotz.Systems;


import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;

/**dd
 * Responsible for checking collisions, making the entities move
 * and apply gravity to the necessary entities
 */
public class PhysicsSystem extends EntitySystem implements ContactListener {


    private World world;


    public PhysicsSystem(EntityManager em) {
        super(em);
        Box2D.init();
        world = new World(new Vector2(0, -40f), true);
        world.setContactListener(this);
    }

    @Override
    public void init(){}


    @Override
    public void update(float dt) {

        //Update the box2D world
        world.step(1 / 60f, 6, 2);


        // Since all contacts have been processed empty them all
        cleanContacts();
    }

    /**
     * Makes a cleanup of the contacts of the entities
     * that would be colliding tih null entities
     */
    public void cleanContacts(){
        for(EntityComponent component: em.getComponents(PhysicsComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent) component;
            phys.getContacts().cleanContacts();
        }
    }



    // CONTACT LISTENING

    /**
     * Dispatches the contact between two entities in their respective PhysicsComponent
     * to be used by other systems, to accomplish certain tasks accordingly
     * @param contact
     */
    @Override
    public void beginContact(Contact contact) {
        //Get Fixtures
        Fixture fixtureA = contact.getFixtureA();
        Fixture fixtureB = contact.getFixtureB();

        //Get Entities
        Entity entityA = (Entity) fixtureA.getBody().getUserData();
        Entity entityB = (Entity) fixtureB.getBody().getUserData();

        //Get Phys
        PhysicsComponent physA = (PhysicsComponent) entityA.getComponent(PhysicsComponent.ID);
        PhysicsComponent physB = (PhysicsComponent) entityB.getComponent(PhysicsComponent.ID);



        //Create EntityContacts
        EntityContact contactA = new EntityContact(fixtureA, fixtureB);
        EntityContact contactB = new EntityContact(fixtureB, fixtureA);


        //Dispatch Contacts
        physA.getContacts().add(contactA);
        physB.getContacts().add(contactB);


    }

    /**
     * Removes the contact between two entities in their respective PhysicsComponent
     * @param contact
     */
    @Override
    public void endContact(Contact contact) {

        //Remove contact only if it was a touching contact (otherwise the contacts would always delete themselves)
       /* if(!contact.isTouching()){
            return;
        }*/

        //Get Entities
        Entity entityA = (Entity) contact.getFixtureA().getBody().getUserData();
        Entity entityB = (Entity) contact.getFixtureB().getBody().getUserData();

        //Get Phys
        PhysicsComponent physA = (PhysicsComponent) entityA.getComponent(PhysicsComponent.ID);
        PhysicsComponent physB = (PhysicsComponent) entityB.getComponent(PhysicsComponent.ID);



        //Remove Contacts
        physA.getContacts().removeContactsWithEntity(entityB);
        physB.getContacts().removeContactsWithEntity(entityA);

    }

    @Override
    public void preSolve(Contact contact, Manifold oldManifold) {}

    @Override
    public void postSolve(Contact contact, ContactImpulse impulse) {}


    // GETTERS AND SETTERS //

    public World getWorld() {
        return world;
    }





}

