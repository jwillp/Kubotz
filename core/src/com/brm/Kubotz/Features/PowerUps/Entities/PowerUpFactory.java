package com.brm.Kubotz.Features.PowerUps.Entities;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityFactory;
import com.brm.GoatEngine.ECS.core.EntityManager;
import com.brm.GoatEngine.ECS.common.SpriteComponent;
import com.brm.Kubotz.Features.Grab.Components.GrabbableComponent;
import com.brm.Kubotz.Common.Components.LifespanComponent;
import com.brm.Kubotz.Features.PowerUps.PowerUp;
import com.brm.Kubotz.Features.PowerUps.Components.PowerUpComponent;
import com.brm.Kubotz.Features.PowerUps.PowerUpEffect;
import com.brm.Kubotz.Constants;
import com.brm.GoatEngine.Hitbox.Hitbox;

/**
 * Used to Create PowerUps
 */
public class PowerUpFactory extends EntityFactory {


    private PowerUpComponent powerUpComponent;
    private LifespanComponent lifespanComp;
    private Vector2 position;
    private Vector2 size = new Vector2(0.3f,0.3f);
    private final World world;


    private SpriteComponent sprite;


    public PowerUpFactory(EntityManager entityManager, World world) {
        super(entityManager);
        this.world = world;
        powerUpComponent = new PowerUpComponent(new PowerUp(null));
        lifespanComp = new LifespanComponent();
        sprite = new SpriteComponent();
    }


    /**
     * Sets the effect of the powerUp
     * @param effect
     * @return
     */
    public PowerUpFactory withEffect(PowerUpEffect effect){
        powerUpComponent.getPowerUp().setEffect(effect);
        String imageFile = "entities/bonus_jump.png";
        if(effect.getClass() == PowerUpEffect.HealthModifier.class){
            imageFile =  "entities/bonus_health.png";
        }
        if(effect.getClass() == PowerUpEffect.SpeedModifier.class){
            imageFile =  "entities/bonus_speed.png";
        }
        if(effect.getClass() == PowerUpEffect.JumpModifier.class){
            imageFile =  "entities/bonus_jump.png";
        }
        if(effect.getClass() == PowerUpEffect.LaserGunMkIProvider.class){
            imageFile =  "entities/bonus_gun.png";
        }
        if(effect.getClass() == PowerUpEffect.LaserSwordProvider.class){
            imageFile =  "entities/bonus_laserSword.png";
        }

        sprite.setCurrentSprite(new TextureRegion(new Texture(Gdx.files.internal(imageFile))));

        sprite.offsetY = 1;
        sprite.offsetX = +0.25f;
        return this;
    }

    /**
     * Set the effect duration of the powerUp
     * @param duration
     * @return
     */
    public PowerUpFactory withDuration(int duration){
        powerUpComponent.getPowerUp().getEffectDuration().setDelay(duration);
        return this;
    }


    /**
     * The Powerup has a lifetime, if not taken within this
     * time frame it disappears
     * @param lifetime
     * @return
     */
    public PowerUpFactory withLifeTime(int lifetime){
        lifespanComp.getCounter().setDelay(lifetime);
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
        powerUp.addComponent(buildBody(powerUp), PhysicsComponent.ID);
        powerUp.addComponent(new GrabbableComponent(), GrabbableComponent.ID);


        //TODO Sprite + Animation Component
        powerUp.addComponent(sprite, SpriteComponent.ID);

        lifespanComp.getCounter().start();

        return powerUp;
    }


    private PhysicsComponent buildBody(Entity powerUp){
        //Readjust position so it is not positioned according to the middle, but rather the bottom left corner
        position = new Vector2(position.x + size.x, position.y + size.y);

        // Physics
        PhysicsComponent physics = new PhysicsComponent(world, BodyDef.BodyType.DynamicBody, position, size.x, size.y);

        CircleShape circleShape = new CircleShape();
        circleShape.setRadius(physics.getWidth());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShape;
        fixtureDef.density = 0.8f;
        fixtureDef.restitution = 0.5f;

        fixtureDef.isSensor = false;

        physics.getBody().createFixture(fixtureDef).setUserData(new Hitbox(Hitbox.Type.Inert, Constants.ENTITY_TAG_POWERUP));
        circleShape.dispose();


        physics.getBody().setUserData(powerUp);

        return physics;
    }

    //TODO Static Methods returning a predefined PowerUp (prefab)




}
