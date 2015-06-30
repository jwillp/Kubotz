package com.brm.GoatEngine.Physics;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.badlogic.gdx.physics.box2d.BodyDef.BodyType;
import com.brm.GoatEngine.Physics.Hitbox.Hitbox;
import com.brm.Kubotz.Constants;

import java.util.Iterator;

/**
 * Delivers collides based on some settings
 * Box2D
 */
public class Colliders{


    /**
     * Creates a Capsule collider (fixtures) to a body
     * @param body the body to which we want to attache a capsule
     * @param width the width of the capsule
     * @param height the height of the capsule
     * @param head the hitbox to use for the head
     * @param torso the hitbox to use for the torso
     * @param legs the hitbox to use for the legs
     */
    public static void createCapsule(Body body, float width, float height, Hitbox head, Hitbox torso, Hitbox legs){

        //Since box2D doubles sizes divide them by 2
        width /= 2;
        height /= 2;


        body.setSleepingAllowed(false);

        FixtureDef fixtureDef;

        ///MIDDLE
        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(width * 0.90f, 0.5f * height);
        fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;
        fixtureDef.density = 0;
        fixtureDef.isSensor = torso.type == Hitbox.Type.Intangible;
        body.createFixture(fixtureDef).setUserData(torso);
        polyShape.dispose();

        // Circle TOP (HEAD)
        CircleShape circleShapeTop = new CircleShape();
        circleShapeTop.setRadius(width);
        circleShapeTop.setPosition(new Vector2(0, height * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeTop;
        fixtureDef.density = 0.1f;
        fixtureDef.isSensor = head.type == Hitbox.Type.Intangible;
        body.createFixture(fixtureDef).setUserData(head);
        circleShapeTop.dispose();


        // Circle BOTTOM (LEGS)
        CircleShape circleShapeBottom = new CircleShape();
        circleShapeBottom.setRadius(width);
        circleShapeBottom.setPosition(new Vector2(0, -height * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeBottom;
        fixtureDef.density = 0.1f;
        fixtureDef.isSensor = legs.type == Hitbox.Type.Intangible;
        body.createFixture(fixtureDef).setUserData(legs);
        circleShapeBottom.dispose();


        //FEET FIXTURE
        PolygonShape footSensor = new PolygonShape();
        footSensor.setAsBox(0.1f,0.1f, new Vector2(0, -height), 0);
        fixtureDef.isSensor = true;
        fixtureDef.shape = footSensor;
        body.createFixture(fixtureDef).setUserData(new Hitbox(Hitbox.Type.Intangible,Constants.HITBOX_LABEL_FEET));

        body.setFixedRotation(true);

    }

    /**
     * Creates a Box collider (rectangle)
     * @param body the body to which we want to attache a capsule
     * @param width the width of the capsule
     * @param height the height of the capsule
     * @param hitbox the hitbox to use for the collider
     */
    public static void createBox(Body body, float width, float height, Hitbox hitbox){

        //Since box2D doubles sizes divide them by 2
        width /= 2;
        height /= 2;


        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(width, height);

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;

        body.createFixture(fixtureDef).setUserData(hitbox);
        polyShape.dispose();

    }


    /**
     * Removes all Colliders/fixtures from a body
     */
    public static void emptyBody(Body body){
        for (Iterator<Fixture> iterator = body.getFixtureList().iterator(); iterator.hasNext(); ) {
            iterator.remove();
        }
    }




    /**
     * Creates a body according to some specifycations
     * @param world the Box2D world in which to create the body
     * @param bodyType the type of the Body
     */
    public static Body createBody(World world, BodyType bodyType, Vector2 position){
        BodyDef bodyDef = new BodyDef();
        bodyDef.type = bodyType;
        bodyDef.position.set(position);
       return world.createBody(bodyDef);
    }

}
