package com.brm.Kubotz.Components;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.CircleShape;
import com.badlogic.gdx.physics.box2d.Fixture;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.Kubotz.Constants;

import java.util.ArrayList;

/**
 * Lets an entity have a Sensor of a certain radius
 * Detecing all other entities within the sensor's bounds
 */
public class SensorComponent extends EntityComponent{

    public final static String ID = "SENSOR_COMP";

    private float radius;

    private ArrayList<String> entities = new ArrayList<String>(); //List of entity IDs


    public SensorComponent(float radius){
        this.radius = radius;
    }


    public void addDetectedEntity(Entity entity){
        entities.add(entity.getID());
    }


    public void cleanDetectedEntities(){
        this.entities.clear();
    }


    @Override
    public void onAttach(Entity entity) {
       PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);


        CircleShape circle = new CircleShape();
        circle.setRadius(this.radius);
        FixtureDef def = new FixtureDef();
        circle.setPosition(new Vector2(0,0));
        def.isSensor = true;
        def.shape = circle;
        Fixture fixture = phys.getBody().createFixture(def);
        fixture.setUserData(Constants.FIXTURE_SENSOR_COMP);

        circle.dispose();

    }


    @Override
    public void onDetach(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        for (int i = 0; i< phys.getBody().getFixtureList().size; i++) {
            if (phys.getBody().getFixtureList().get(i).getUserData().equals(Constants.FIXTURE_SENSOR_COMP)) {
                phys.getBody().getFixtureList().removeIndex(i);
                break;
            }
        }
    }
}
