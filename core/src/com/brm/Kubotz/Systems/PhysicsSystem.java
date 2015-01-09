package com.brm.Kubotz.Systems;


import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.Kubotz.Properties.PhysicsProperty;

import java.util.Stack;

/**dd
 * Responsible for checking collisions, making the entities move
 * and apply gravity to the necessary entities
 */
public class PhysicsSystem extends com.brm.GoatEngine.ECS.System.System implements ContactListener {


    private World world;
    private Stack<Contact> contacts;

    public PhysicsSystem(EntityManager em) {
        super(em);
    }

    public void init() {

        Box2D.init();
        this.contacts = new Stack<Contact>();
        world = new World(new Vector2(0, -40f), true);
        world.setContactListener(this);


    }

    @Override
    public void update(float dt) {

        processContacts();
        world.step(1 / 60f, 6, 2);

    }


    /**
     * Processes all the Box2D contact at once instead of relying
     * on the callbacks that could happen anytime
     */
    private void processContacts(){

        for(Contact contact: this.contacts){
            Fixture fixtureA = contact.getFixtureA();
            Fixture fixtureB = contact.getFixtureB();


            Body bodyA = contact.getFixtureA().getBody();
            Body bodyB = contact.getFixtureB().getBody();


            if(bodyA.getType() != bodyB.getType()){
                Logger.log(fixtureA.getUserData());
                Logger.log(fixtureB.getUserData());
                if(fixtureA.getUserData() == "footSensor"){ //And B is logically not a Dynamic body

                    Entity a = (Entity) bodyA.getUserData();
                    ((PhysicsProperty)a.getProperty(PhysicsProperty.ID)).setGrounded(true);

                }else if(fixtureB.getUserData() == "footSensor"){  //And A is logically not a Dynamic body

                    Entity b = (Entity) bodyB.getUserData();
                    ((PhysicsProperty)b.getProperty(PhysicsProperty.ID)).setGrounded(true);
                }
            }
        }
        //We are done with it
        this.contacts.clear();
    }

    // CONTACT LISTENING

    @Override
    public void beginContact(Contact contact) {
        Fixture fixtureA = contact.getFixtureA();
        Fixture fixtureB = contact.getFixtureB();


        Body bodyA = contact.getFixtureA().getBody();
        Body bodyB = contact.getFixtureB().getBody();


        if(bodyA.getType() != bodyB.getType()){
            if(fixtureA.getUserData() == "footSensor"){ //And B is logically not a Dynamic body

                Entity a = (Entity) bodyA.getUserData();
                ((PhysicsProperty)a.getProperty(PhysicsProperty.ID)).setGrounded(true);

            }else if(fixtureB.getUserData() == "footSensor"){  //And A is logically not a Dynamic body

                Entity b = (Entity) bodyB.getUserData();
                ((PhysicsProperty)b.getProperty(PhysicsProperty.ID)).setGrounded(true);
            }
        }

    }

    @Override
    public void endContact(Contact contact) {
        Fixture fixtureA = contact.getFixtureA();
        Fixture fixtureB = contact.getFixtureB();


        Body bodyA = contact.getFixtureA().getBody();
        Body bodyB = contact.getFixtureB().getBody();


        if(bodyA.getType() != bodyB.getType()){
            if(fixtureA.getUserData() == "footSensor"){ //And B is logically not a Dynamic body

                Entity a = (Entity) bodyA.getUserData();
                ((PhysicsProperty)a.getProperty(PhysicsProperty.ID)).setGrounded(false);

            }else if(fixtureB.getUserData() == "footSensor"){  //And A is logically not a Dynamic body

                Entity b = (Entity) bodyB.getUserData();
                ((PhysicsProperty)b.getProperty(PhysicsProperty.ID)).setGrounded(false);
            }
        }
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

