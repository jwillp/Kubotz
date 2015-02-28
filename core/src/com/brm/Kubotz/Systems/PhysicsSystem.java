package com.brm.Kubotz.Systems;


import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.CONSTANTS;
import com.brm.Kubotz.GameConstant;

import java.util.Stack;

/**dd
 * Responsible for checking collisions, making the entities move
 * and apply gravity to the necessary entities
 */
public class PhysicsSystem extends EntitySystem implements ContactListener {


    private World world;
    private Stack<Contact> contacts;

    public PhysicsSystem(EntityManager em) {
        super(em);
        Box2D.init();
        this.contacts = new Stack<Contact>();
        world = new World(new Vector2(0, -40f), true);
        world.setContactListener(this);


    }


    @Override
    public void update(float dt) {

        world.step(1 / 60f, 6, 2);

    }




    // CONTACT LISTENING

    @Override
    public void beginContact(Contact contact) {
        Fixture fixtureA = contact.getFixtureA();
        Fixture fixtureB = contact.getFixtureB();

        //Feet sensor Test
        if(fixtureA.getBody().getType() != fixtureB.getBody().getType()){
            testFeetSensor(fixtureA, true);
            testFeetSensor(fixtureB, true);
        }

    }

    @Override
    public void endContact(Contact contact) {
        Fixture fixtureA = contact.getFixtureA();
        Fixture fixtureB = contact.getFixtureB();

        //Feet sensor Test
        if(fixtureA.getBody().getType() != fixtureB.getBody().getType()){
            // Our feet are leaving ground, we are not grounded anymore
            testFeetSensor(fixtureA, false);
            testFeetSensor(fixtureB, false);
        }
    }


    @Override
    public void preSolve(Contact contact, Manifold oldManifold) {}

    @Override
    public void postSolve(Contact contact, ContactImpulse impulse) {}




    /**
     * Check if a body is grounded according to it's feet sensor
     * and according to the case set it as grounded or not
     * @param fixture The fixture of the body to test
     * @param grounded If the test is true whether we set the body as grounded or not
     * @return returns whether or not the test was valid
     */
    public void testFeetSensor(Fixture fixture, boolean grounded){
        if(fixture.getUserData() != null) {
            if (fixture.getUserData().equals(GameConstant.FIXTURE_FEET_SENSOR)) { //And B is logically not a Dynamic body
                Entity entity = (Entity) fixture.getBody().getUserData();
                ((PhysicsComponent) entity.getComponent(PhysicsComponent.ID)).setGrounded(grounded);
            }
        }
    }

    public void processContact(Contact contact){
        Fixture fixtureA = contact.getFixtureA();
        Fixture fixtureB = contact.getFixtureB();

        //Feet sensor Test
        if(fixtureA.getBody().getType() != fixtureB.getBody().getType()){
            testFeetSensor(fixtureA, true);
            testFeetSensor(fixtureB, true);
        }
    }












    // GETTERS AND SETTERS //

    public World getWorld() {
        return world;
    }





}

