package com.brm.GoatEngine.ECS.Components;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Entity.EntityContact;

import java.util.ArrayList;

/**
 * All the physical properties of the entity so it can exist in a physical World
 * Dependencie: Box2D
 */
public class PhysicsComponent extends EntityComponent {

    public final static String ID = "PHYSICS_PROPERTY";

    //The directions an entity can face
    public enum Direction{
        LEFT,  //RIGHT
        RIGHT, //LEFT
    }


    private Body body;  //the physical body of the entity
    private Vector2 acceleration = new Vector2(0,0);   // The acceleration rate
    public final Vector2 MAX_SPEED = new Vector2(18f, 18f); //The max velocity the entity can go

    private boolean isGrounded = false; //Whether or not the entity's feet touch the ground

    public Direction direction = Direction.LEFT;



    private float width;   //The width of the entity(in game units)
    private float height;  //The height of the entity (in game units)

    // List of all the contacts that recently happened to the entities.
    // The a entity will always be the current entity.
    public ArrayList<EntityContact> contacts = new ArrayList<EntityContact>();



    /**
     * CTOR
     * @param world
     * @param bodyType
     * @param position
     * @param width
     * @param height
     */
    public PhysicsComponent(World world, BodyDef.BodyType bodyType, Vector2 position, float width, float height){

        this.setWidth(width);
        this.setHeight(height);

        BodyDef bodyDef = new BodyDef();
        bodyDef.type = bodyType;
        bodyDef.position.set(position.x, position.y);

        this.body = world.createBody(bodyDef);
    }



    @Override
    public void onDetach() {
        super.onDetach();
        this.getBody().getWorld().destroyBody(this.body);
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
