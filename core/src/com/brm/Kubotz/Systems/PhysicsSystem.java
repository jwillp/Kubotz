package com.brm.Kubotz.Systems;


import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Component.DamageComponent;
import com.brm.Kubotz.Component.PunchComponent;
import com.brm.Kubotz.Constants;

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
    public void update(float dt) {

        //Update the box2D world
        world.step(1 / 60f, 6, 2);

        // Since all contacts have been processed empty them all
        //clearContacts();
    }

    /**
     * Clears the contact for all the entities
     * with a physics component
     */
    public void clearContacts(){
       for(Component component: em.getComponents(PhysicsComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent) component;
           phys.contacts.clear();
        }
    }


    // CONTACT LISTENING
    @Override
    public void beginContact(Contact contact) {
        dispatchContactEvent(contact, EntityContact.Describer.BEGIN);
    }

    @Override
    public void endContact(Contact contact) {
        dispatchContactEvent(contact, EntityContact.Describer.END);
    }

    @Override
    public void preSolve(Contact contact, Manifold oldManifold) {}

    @Override
    public void postSolve(Contact contact, ContactImpulse impulse) {}


    /**
     * Dispatches the contact between two entities in their respective PhysicsComponent
     * to be used by other systems, to accomplish certain tasks accordingly
     * @param contact the contact event
     * @param describer the describer of the event (BEGIN || END)
     */
    public void dispatchContactEvent(Contact contact, EntityContact.Describer describer){

        //Get Fixtures
        Fixture fixtureA = contact.getFixtureA();
        Fixture fixtureB = contact.getFixtureB();

        //Get Entities
        Entity entityA = (Entity) fixtureA.getBody().getUserData();
        Entity entityB = (Entity) fixtureB.getBody().getUserData();

       //Get Phys
        PhysicsComponent physA = (PhysicsComponent) entityA.getComponent(PhysicsComponent.ID);
        PhysicsComponent physB = (PhysicsComponent) entityB.getComponent(PhysicsComponent.ID);

        // TODO Test over time
        if(physA.contacts.hasContactWithEntity(entityB) || physB.contacts.hasContactWithEntity(entityA)){
            return;
        }

        //Create EntityContacts
        EntityContact contactA = new EntityContact(fixtureA, fixtureB, describer);
        EntityContact contactB = new EntityContact(fixtureB, fixtureA, describer);


        //Dispatch Contacts
        physA.contacts.add(contactA);
        physB.contacts.add(contactB);
    }




    // GETTERS AND SETTERS //

    public World getWorld() {
        return world;
    }





}

