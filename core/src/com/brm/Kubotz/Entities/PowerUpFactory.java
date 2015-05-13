package com.brm.Kubotz.Entities;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.Kubotz.Component.LifespanComponent;
import com.brm.Kubotz.Component.Powerups.PowerUp;
import com.brm.Kubotz.Component.Powerups.PowerUpComponent;
import com.brm.Kubotz.Component.Powerups.PowerUpEffect;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Systems.LifespanSystem;

/**
 * Used to Create PowerUps
 */
public class PowerUpFactory extends EntityFactory {


    private PowerUpComponent powerUpComponent;
    private LifespanComponent lifespanComp;
    private Vector2 position;
    private Vector2 size = new Vector2(1,1);
    private final World world;


    public PowerUpFactory(EntityManager entityManager, World world) {
        super(entityManager);
        this.world = world;
        powerUpComponent = new PowerUpComponent(new PowerUp(null));
        lifespanComp = new LifespanComponent();
    }


    /**
     * Sets the effect of the powerUp
     * @param effect
     * @return
     */
    public PowerUpFactory withEffect(PowerUpEffect effect){
        powerUpComponent.getPowerUp().effect = effect;
        return this;
    }

    /**
     * Set the effect duration of the powerUp
     * @param duration
     * @return
     */
    public PowerUpFactory withDuration(int duration){
        powerUpComponent.getPowerUp().effectDuration.setDelay(duration);
        return this;
    }


    /**
     * The Powerup has a lifetime, if not taken within this
     * time frame it disappears
     * @param duration
     * @return
     */
    public PowerUpFactory withLifeTime(int duration){
        lifespanComp.counter.setDelay(duration);
        return this;
    }

    /**
     * Sets the position of the power up
     * @param position
     * @return
     */
    public PowerUpFactory withPosition(Vector2 position){
        this.position = position;
        return this;
    }



    @Override
    public Entity build() {

        Entity powerUp = new Entity();
        entityManager.registerEntity(powerUp);

        powerUp.addComponent(powerUpComponent, PowerUpComponent.ID);
        powerUp.addComponent(lifespanComp, LifespanComponent.ID);

        //TODO Sprite + Animation Component


        return powerUp;
    }


    private PhysicsComponent buildBody(Entity bullet){
        //Readjust position so it is not positioned according to the middle, but rather the bottom left corner
        position = new Vector2(position.x + size.x, position.y + size.y);

        // Physics
        PhysicsComponent physics = new PhysicsComponent(world, BodyDef.BodyType.KinematicBody, position, size.x, size.y);

        CircleShape circleShape = new CircleShape();
        circleShape.setRadius(physics.getWidth());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShape;
        fixtureDef.density = 0.1f;
        fixtureDef.restitution = 0.5f;

        fixtureDef.isSensor = true;

        physics.getBody().createFixture(fixtureDef).setUserData(Constants.ENTITY_TAG_POWERUP);
        circleShape.dispose();


        physics.getBody().setUserData(bullet);


        return physics;
    }

    //TODO Static Methods returnning a predefined PowerUp




}
