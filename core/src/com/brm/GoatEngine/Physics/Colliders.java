package com.brm.GoatEngine.Physics;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.badlogic.gdx.physics.box2d.BodyDef.BodyType;
import com.brm.Kubotz.Common.Hitbox.Hitbox;
import com.brm.Kubotz.Constants;

/**
 * Delivers collides based on some settings
 * Box2D
 */
public class Colliders{


    /**
     * Creates a Capsule collider (fixtures) to a body
     * @param body
     * @param width
     * @param height
     * @param head
     * @param torso
     * @param feet
     */
    public static void createCapsule(Body body, int width, int height, Hitbox head, Hitbox torso, Hitbox feet){

        body.setSleepingAllowed(false);

        FixtureDef fixtureDef;

        ///MIDDLE
        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(width * 0.90f, 0.5f * height);
        fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;
        fixtureDef.density = 0;
        body.createFixture(fixtureDef).setUserData(torso);
        polyShape.dispose();

        // Circle TOP
        CircleShape circleShapeTop = new CircleShape();
        circleShapeTop.setRadius(width);
        circleShapeTop.setPosition(new Vector2(0, height * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeTop;
        fixtureDef.density = 0.1f;
        fixtureDef.isSensor = head.type == Hitbox.Type.Intangible;
        body.createFixture(fixtureDef).setUserData(head);
        circleShapeTop.dispose();


        // Circle BOTTOM
        CircleShape circleShapeBottom = new CircleShape();
        circleShapeBottom.setRadius(width);
        circleShapeBottom.setPosition(new Vector2(0, -height * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeBottom;
        fixtureDef.density = 0.1f;
        body.createFixture(fixtureDef).setUserData(feet);
        circleShapeBottom.dispose();


        //FEET FIXTURE
        PolygonShape footSensor = new PolygonShape();
        footSensor.setAsBox(0.1f,0.1f, new Vector2(0, -height), 0);
        fixtureDef.isSensor = true;
        fixtureDef.shape = footSensor;
        body.createFixture(fixtureDef).setUserData(new Hitbox(Hitbox.Type.Intangible,Constants.HITBOX_LABEL_FEET));


    }


    /**
     * Creates a body according to some specifycations
     * @param world the Box2D world in which to create the body
     * @param bodyType the type of the Body
     */
    public Body createBody(World world, BodyType bodyType){
        BodyDef bodyDef = new BodyDef();
        bodyDef.type = bodyType;
        bodyDef.position.set(0, 0);
       return world.createBody(bodyDef);
    }

}
