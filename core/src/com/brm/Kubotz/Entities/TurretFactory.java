package com.brm.Kubotz.Entities;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.BodyDef;
import com.badlogic.gdx.physics.box2d.CircleShape;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.utils.Components.TrackerComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.core.Entity.EntityManager;

/**
 * Creates Turret
 */
public class TurretFactory extends EntityFactory {

    private World world;
    private String targetId;
    private Vector2 position = new Vector2(0,0);
    private Vector2 size = new Vector2(0.4f, 0.4f);
    private Vector2 distance = new Vector2(-2,2);
    /**
     * Ctor
     * @param entityManager
     * @param world
     * @param target
     */
    public TurretFactory(EntityManager entityManager, World world, Entity target){
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
    public TurretFactory(EntityManager entityManager, World world, String targetId){
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
    public TurretFactory withSize(float witdh, float height){
        size.x = witdh;
        size.y = height;
        return this;
    }

    public TurretFactory withPosition(Vector2 position){
        this.position = position;
        return this;
    }

    public TurretFactory withDistance(Vector2 distance){
        this.distance = distance;
        return this;
    }

    @Override
    public Entity build() {
        Entity turret = new Entity();
        entityManager.registerEntity(turret);


        // Physics
        PhysicsComponent physics;
        physics = new PhysicsComponent(world, BodyDef.BodyType.KinematicBody, position, 0.5f,0.5f);
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
        TrackerComponent trackerComponent = new TrackerComponent(this.targetId);
        trackerComponent.setDistance(this.distance);

        turret.addComponent(physics, PhysicsComponent.ID);
        turret.addComponent(trackerComponent, TrackerComponent.ID);



        return turret;
    }





}
