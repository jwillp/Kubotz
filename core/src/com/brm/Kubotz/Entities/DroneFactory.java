package com.brm.Kubotz.Entities;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.BodyDef;
import com.badlogic.gdx.physics.box2d.CircleShape;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.ScriptComponent;
import com.brm.GoatEngine.ECS.Components.TrackerComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.Kubotz.Components.AIComponent;
import com.brm.Kubotz.Scripts.AI.DroneBehaviourScript;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.utils.Components.TrackerComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.core.Entity.EntityManager;


/**
 * Creates Drones
 */
public class DroneFactory extends EntityFactory {

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
    public DroneFactory(EntityManager entityManager, World world, Entity target){
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
    public DroneFactory(EntityManager entityManager, World world, String targetId){
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
    public DroneFactory withSize(float witdh, float height){
        size.x = witdh;
        size.y = height;
        return this;
    }

    public DroneFactory withPosition(Vector2 position){
        this.position = position;
        return this;
    }

    public DroneFactory withDistance(Vector2 distance){
        this.distance = distance;
        return this;
    }

    @Override
    public Entity build() {
        Entity drone = new Entity();
        entityManager.registerEntity(drone);


        // Physics
        PhysicsComponent physics;
        physics = new PhysicsComponent(world, BodyDef.BodyType.DynamicBody, position, 0.5f,0.5f);
        physics.getAcceleration().set(120.0f, 120.0f);

        CircleShape circleShape = new CircleShape();
        circleShape.setRadius(physics.getWidth());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShape;
        fixtureDef.density = 0.1f;
        fixtureDef.isSensor = false;

        physics.getBody().setFixedRotation(true);
        physics.getBody().createFixture(fixtureDef);
        circleShape.dispose();

        physics.getBody().setGravityScale(0);


        drone.addComponent(physics, PhysicsComponent.ID);

        // AI
        AIComponent aiComponent = new AIComponent();
        aiComponent.getBlackboard().put("master", targetId);
        aiComponent.getBlackboard().put("minMasterDistance", this.distance);
        drone.addComponent(aiComponent, AIComponent.ID);

        //Scripts
        ScriptComponent script = new ScriptComponent();
        script.addScript(new DroneBehaviourScript(), drone ,entityManager);
        drone.addComponent(script, ScriptComponent.ID);




        return drone;
    }





}
