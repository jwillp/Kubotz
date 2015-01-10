package com.brm.Kubotz.Entities;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.BodyDef;
import com.badlogic.gdx.physics.box2d.CircleShape;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.TrackerComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityBuilder;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.Utils.Logger;

/**
 * Creates Turret
 */
public class TurretBuilder extends EntityBuilder{

    private World world;
    private String targetId;
    private Vector2 position = new Vector2(0,0);
    private Vector2 size = new Vector2(0.4f, 0.4f);

    /**
     * Ctor
     * @param entityManager
     * @param world
     * @param target
     */
    public TurretBuilder(EntityManager entityManager, World world, Entity target){
        super(entityManager);
        this.world = world;
        this.targetId = target.getID();
        this.initPosition();
    }

    /**
     * Ctor
     * @param entityManager
     * @param world
     * @param targetId
     */
    public TurretBuilder(EntityManager entityManager, World world, String targetId){
        super(entityManager);
        this.world = world;
        this.targetId = targetId;
        this.initPosition();
    }

    /**
     * Inits the position of the turret according to its target
     */
    private void initPosition(){
        this.position.x = ((PhysicsComponent)this.entityManager.getComponent(PhysicsComponent.ID, targetId)).getPosition().x - 4;
        this.position.y = ((PhysicsComponent)this.entityManager.getComponent(PhysicsComponent.ID, targetId)).getPosition().y + 4;

    }



    /**
     * Allows to set the size of the generated Turret
     * @return BlockBuilder for chaining
     */
    public TurretBuilder withSize(float witdh, float height){
        size.x = witdh;
        size.y = height;
        return this;
    }

    public TurretBuilder withPosition(Vector2 position){
        this.position = position;
        return this;
    }


    @Override
    public Entity build() {
        Entity turret = new Entity();
        entityManager.registerEntity(turret);


        // Physics
        PhysicsComponent physics;
        physics = new PhysicsComponent(world, BodyDef.BodyType.KinematicBody, position.x,position.y, 0.5f,0.5f);
        physics.getAcceleration().set(120.0f, 120.0f);

        CircleShape circleShape = new CircleShape();
        circleShape.setRadius(physics.getWidth());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShape;
        fixtureDef.density = 0.1f;

        physics.getBody().setFixedRotation(true);
        physics.getBody().createFixture(fixtureDef);
        circleShape.dispose();


        //Tracker Component
        turret.addComponent(physics, PhysicsComponent.ID);
        turret.addComponent(new TrackerComponent(this.targetId), TrackerComponent.ID);

        return turret;
    }





}
