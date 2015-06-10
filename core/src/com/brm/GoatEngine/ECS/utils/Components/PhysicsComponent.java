package com.brm.GoatEngine.ECS.utils.Components;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;

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
    private final Vector2 MAX_SPEED = new Vector2(18f, 18f); //The max velocity the entity can go

    private boolean isGrounded = false; //Whether or not the entity's feet touch the ground

    private Direction direction = Direction.LEFT;

    private float width;   //The width of the entity(in game units)
    private float height;  //The height of the entity (in game units)


    /**
     * CTOR
     * @param world the world in which we want to add the body
     * @param bodyType Type of Box2D body
     * @param position the initial position
     * @param width the width
     * @param height the height
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
    public void onDetach(Entity entity) {
        super.onDetach(entity);
        this.getBody().getWorld().destroyBody(this.body);
    }

    /**
     * Returns the entity's BoundingBox
     * (The X,Y position of the entity corresponds to the bottom left of the bounding box)
     * @return
     */
    public Rectangle getBounds(){
        return new Rectangle(this.getPosition().x - this.getWidth(), this.getPosition().y-this.getHeight(), this.getWidth()*2, this.getHeight()*2);
    }

    public Vector2 getPosition() {
        return this.body.getPosition();
    }

    public void setPosition(float x, float y){
        this.body.setTransform(x,y, this.body.getAngle());
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

    public Vector2 getMaxSpeed() {
        return MAX_SPEED;
    }

    public Direction getDirection() {
        return direction;
    }

    public void setDirection(Direction direction) {
        this.direction = direction;
    }





}
