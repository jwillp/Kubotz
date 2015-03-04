package com.brm.Kubotz.Systems;


import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.PunchComponent;
import com.brm.Kubotz.GameConstant;

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

        testPunch(contact.getFixtureA(), contact.getFixtureB());

        contact.

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
    private void testFeetSensor(Fixture fixture, boolean grounded){
        if(fixture.getUserData() != null) {
            if (fixture.getUserData().equals(GameConstant.FIXTURE_FEET_SENSOR)) { //And B is logically not a Dynamic body
                Entity entity = (Entity) fixture.getBody().getUserData();
                ((PhysicsComponent) entity.getComponent(PhysicsComponent.ID)).setGrounded(grounded);
            }
        }
    }

    /**
     * Test if the contact between two bodies involves a punch
     * @param fixtureA
     * @param fixtureB
     */
    private void testPunch(Fixture fixtureA, Fixture fixtureB){

        //if none of the fixture has userdata
        if(fixtureA.getUserData() == null || fixtureB.getUserData() == null){
            return;
        }


        //TEST A as Punch
        if(fixtureA.getUserData().equals(GameConstant.FIXTURE_PUNCH_ATTACK)){
            Entity entityB = (Entity)fixtureB.getBody().getUserData();
            if(entityB.hasComponentEnabled(HealthComponent.ID)){
                    handlePunch((Entity)fixtureA.getBody().getUserData(), entityB);
            }
        }

        //TEST B as punch
        if(fixtureB.getUserData().equals(GameConstant.FIXTURE_PUNCH_ATTACK)){
            Entity entityA = (Entity)fixtureA.getBody().getUserData();
            if(entityA.hasComponentEnabled(HealthComponent.ID)){
                handlePunch((Entity)fixtureB.getBody().getUserData(), entityA);
            }
        }



    }

    /**
     * Handles a punch between a puncher and a target
     * @param puncher
     * @param target
     */
    private void handlePunch(Entity puncher, Entity target){
        PunchComponent punch = (PunchComponent) puncher.getComponent(PunchComponent.ID);
        HealthComponent health = (HealthComponent)target.getComponent(HealthComponent.ID);
        health.substractAmount(punch.damage);
        System.out.println(health.getAmount());
    }










    // GETTERS AND SETTERS //

    public World getWorld() {
        return world;
    }





}

