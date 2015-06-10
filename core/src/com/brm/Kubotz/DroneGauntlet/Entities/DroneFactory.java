package com.brm.Kubotz.DroneGauntlet.Entities;


import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.core.Entity.EntityManager;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.utils.Components.ScriptComponent;
import com.brm.Kubotz.AI.Components.AIComponent;
import com.brm.Kubotz.DroneGauntlet.Scripts.DroneBehaviourScript;
import com.brm.Kubotz.Hitbox.Hitbox;


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
        physics.getBody().setFixedRotation(true);

        CircleShape circleShape = new CircleShape();
        circleShape.setRadius(physics.getWidth());

        // MAIN HURTBOX
        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShape;
        fixtureDef.density = 0.1f;
        fixtureDef.isSensor = false;

        Fixture mainHurtbox = physics.getBody().createFixture(fixtureDef);
        mainHurtbox.setUserData(new Hitbox(Hitbox.Type.Damageable));


        // VISION HITBOX
        circleShape.setRadius(physics.getWidth() * 1.5f);
        FixtureDef visionDef = new FixtureDef();
        visionDef.isSensor = true;
        visionDef.shape = circleShape;


        Fixture visionBox = physics.getBody().createFixture(visionDef);
        visionBox.setUserData(new Hitbox(Hitbox.Type.Intangible));

        circleShape.dispose();

        physics.getBody().setGravityScale(0);
        physics.getBody().setUserData(drone);


        drone.addComponent(physics, PhysicsComponent.ID);

        //HEALTH
        drone.addComponent(new HealthComponent(30), HealthComponent.ID);

        // AI
        AIComponent aiComponent = new AIComponent();
        aiComponent.getBlackboard().put("master", targetId);
        aiComponent.getBlackboard().put("minMasterDistance", this.distance);
        drone.addComponent(aiComponent, AIComponent.ID);

        //Scripts
        ScriptComponent script = new ScriptComponent();
        script.addScript(new DroneBehaviourScript());
        drone.addComponent(script, ScriptComponent.ID);

        return drone;
    }





}