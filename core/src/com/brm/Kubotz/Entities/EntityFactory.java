package com.brm.Kubotz.Entities;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.Kubotz.Properties.AppearanceProperty;
import com.brm.Kubotz.Properties.JumpProperty;
import com.brm.Kubotz.Properties.PhysicsProperty;
import com.brm.Kubotz.Properties.ControllableProperty;
import com.brm.Kubotz.Properties.Skills.FlyProperty;


/**
 * Classed use to create Entities
 */
public class EntityFactory {

    /**
     * Creates a Block Entity
     * @return
     */

    public static Entity createBlock(World world, float x, float y, float width, float height){
        Entity block = new Entity();

        //Position
        PhysicsProperty physics = new PhysicsProperty(world, BodyDef.BodyType.StaticBody, x,y, width, height);
        block.addProperty(physics, PhysicsProperty.ID);

        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(physics.getWidth(), physics.getHeight());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;


        physics.getBody().createFixture(fixtureDef);
        polyShape.dispose();

        //Appearance
        AppearanceProperty appearance = new AppearanceProperty();
        appearance.setDebugColor(Color.ORANGE);
        block.addProperty(appearance, AppearanceProperty.ID);


        physics.getBody().setUserData(block);

        return block;
    }

    /**
     * Creates a Character
     * @return
     */
    public static Entity createCharacter(World world, float x, float y){
        Entity character = new Entity();

        //Physics
        PhysicsProperty physics = new PhysicsProperty(world, BodyDef.BodyType.DynamicBody, x, y, 0.5f,0.5f);
        physics.getAcceleration().set(0.5f, 15.0f);

        CircleShape circleShape = new CircleShape();
        circleShape.setRadius(physics.getWidth());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShape;
        fixtureDef.density = 0.1f;


        physics.getBody().setFixedRotation(true);
        physics.getBody().createFixture(fixtureDef);
        circleShape.dispose();

        //foot fixture
        PolygonShape footSensor = new PolygonShape();
        footSensor.setAsBox(0.1f,0.1f, new Vector2(0,-0.5f), 0);
        fixtureDef.isSensor = true;
        fixtureDef.shape = footSensor;
        physics.getBody().createFixture(fixtureDef).setUserData("footSensor");

        character.addProperty(physics, PhysicsProperty.ID);


        // Add user data to Body
        physics.getBody().setUserData(character);

        //Appearance
        AppearanceProperty appearance = new AppearanceProperty();
        appearance.setDebugColor(Color.GREEN);
        character.addProperty(appearance, AppearanceProperty.ID);

        //Control
        ControllableProperty cp = new ControllableProperty();
        character.addProperty(cp, ControllableProperty.ID);


        // Jump
        JumpProperty jp = new JumpProperty(2);
        character.addProperty(jp, JumpProperty.ID);

        // Flying Property
        FlyProperty fp = new FlyProperty(10,1);
        character.addProperty(fp, FlyProperty.ID);

        return character;
    }



}
