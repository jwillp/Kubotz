package com.brm.GoatEngine.ECS.Entity;

import com.badlogic.gdx.physics.box2d.Fixture;
import com.brm.GoatEngine.ECS.Entity.Entity;

import java.util.ArrayList;

/**
 * A Contact between two entities. Usually used by Systems to do a certain task when a certain collision happens.
 */
public class EntityContact {

    //The moment at which the contact info where generated (At the beginning of the contact or the end of the contact)
    public enum Describer {
        BEGIN,
        END
    }

    public Fixture fixtureA;
    public Fixture fixtureB;
    public final Describer describer; //Describes the beginning or the end of the contact


    public EntityContact(Fixture fixtureA, Fixture fixtureB, Describer describer){
        this.fixtureA = fixtureA;
        this.fixtureB = fixtureB;
        this.describer = describer;
    }


    /**
     * Returns the entity A
     * @return
     */
    public Entity getEntityA(){
        return (Entity) this.fixtureA.getBody().getUserData();
    }

    /**
     * Returns the entity B
     * @return
     */
    public Entity getEntityB(){
        return (Entity) this.fixtureB.getBody().getUserData();
    }






}
