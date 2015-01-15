package com.brm.GoatEngine.ECS.Components;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Components.Component;

/**
 * All the physical properties of the entity so it can exist in a physical World
 * Dependencie: Box2D
 */
public class PhysicsComponent extends Component {

    public final static String ID = "PHYSICS_PROPERTY";

    private Body body;
    private Vector2 acceleration = new Vector2(0,0);
    public final Vector2 MAX_SPEED = new Vector2(18f, 18f);

    private boolean isGrounded = false;


    private float width;
    private float height;



    public PhysicsComponent(World world, BodyDef.BodyType bodyType, float x, float y, float width, float height){

        this.setWidth(width);
        this.setHeight(height);

        BodyDef bodyDef = new BodyDef();
        bodyDef.type = bodyType;
        bodyDef.position.set(x, y);

        this.body = world.createBody(bodyDef);


    }



    /**
     * Returns the entity's BoundingBox
     * (The X,Y position of the entity corresponds to the bottom left of the bounding box)
     * @return
     */
    public Rectangle getBounds(){

        return new Rectangle(this.getPosition().x - this.getWidth()/2, this.getPosition().y-this.getHeight()/2, this.getWidth(), this.getHeight());
    }

    public Vector2 getPosition() {
        return this.body.getPosition();
    }


    public Vector2 getAcceleration() {
        return acceleration;
    }

    public Vector2 getVelocity(){return this.body.getLinearVelocity();}



    public float getWidth() {
        return width;
    }

    public void setWidth(float width) {
        this.width = width;
    }

    public float getHeight() {
        return height;
    }

    public void setHeight(float height) {
        this.height = height;
    }


    public boolean isGrounded() {
        return isGrounded;
    }

    public void setGrounded(boolean isGrounded) {
        this.isGrounded = isGrounded;
    }

    public Body getBody() {
        return body;
    }
}
