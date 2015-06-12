package com.brm.Kubotz.Features.LaserGuns.Entities;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.BodyDef;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.badlogic.gdx.physics.box2d.PolygonShape;
import com.badlogic.gdx.physics.box2d.World;
import com.brashmonkey.spriter.Spriter;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.utils.Components.ScriptComponent;
import com.brm.GoatEngine.ECS.utils.Components.TagsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.core.Entity.EntityManager;
import com.brm.Kubotz.Common.Components.DamageComponent;
import com.brm.Kubotz.Common.Components.Graphics.SpriteComponent;
import com.brm.Kubotz.Common.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Common.Components.LifespanComponent;
import com.brm.Kubotz.Common.Components.Graphics.ParticleEffectComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Common.Hitbox.Hitbox;
import com.brm.Kubotz.Features.LaserGuns.Scripts.BulletGraphicsScript;

/**
 * Used to generate bullets
 */
public class BulletFactory extends EntityFactory {

    private World world;
    private DamageComponent dmgComp;
    private LifespanComponent lifespanComp;
    private TagsComponent tagsComponent;
    private Vector2 size;
    private Vector2 position;
    private Vector2 speed;
    private PhysicsComponent.Direction direction;


    public BulletFactory(EntityManager entityManager, World world, Vector2 position) {
        super(entityManager);
        this.dmgComp = new DamageComponent(0);
        this.lifespanComp = new LifespanComponent();
        this.tagsComponent = new TagsComponent();
        this.size = new Vector2(0.2f, 0.2f);
        this.position = position;
        this.speed = new Vector2(0,0);
        this.world = world;
    }


    /**
     * The number of damage the bullet can deal
     * @param nbDamage
     * @return this for chaining
     */
    public BulletFactory withDamage(float nbDamage){
        this.dmgComp.setDamage(nbDamage);
        return this;
    }

    /**
     * Sets the knockback when entities collide with the bullet
     * @param knockback
     * @return this for chaining
     */
    public BulletFactory withKnockBack(Vector2 knockback){
        this.dmgComp.setKnockBack(knockback);
        return this;
    }


    /**
     * Sets the lifespan of the bullet
     * @param lifespan
     * @return this for chaining
     */
    public BulletFactory withLifespan(int lifespan){
        this.lifespanComp = new LifespanComponent(lifespan);
        return this;
    }

    /**
     * Allows to set the size of the generated Bullet
     * @return BlockBuilder for chaining
     */
    public BulletFactory withSize(float width, float height){
        size.x = width/2; //Divide by half because box2D width equals half of shape
        size.y = height/2;
        return this;
    }

    /**
     * Sets the speed of the bullet
     * @param speed
     * @return
     */
    public BulletFactory withSpeed(Vector2 speed){
       this.speed = speed;
        return this;
    }



    @Override
    public Entity build() {
        Entity bullet = new Entity();
        entityManager.registerEntity(bullet);

        //Damage component
        bullet.addComponent(this.dmgComp, DamageComponent.ID);

        //Lifespan
        bullet.addComponent(this.lifespanComp, LifespanComponent.ID);

        //Physics body
        PhysicsComponent phys = this.buildBody(bullet);
        bullet.addComponent(phys, PhysicsComponent.ID);

        //Tags Component
        this.tagsComponent.addTag(Constants.ENTITY_TAG_BULLET);
        bullet.addComponent(this.tagsComponent, TagsComponent.ID);


        // Particle Effect
        bullet.addComponent(new ParticleEffectComponent(), ParticleEffectComponent.ID);


        // Appearance
        SpriteComponent sprite = new SpriteComponent();
        sprite.setCurrentSprite(new TextureRegion(new Texture(Gdx.files.internal("entities/bullet.png"))));
        bullet.addComponent(sprite, SpriteComponent.ID);



        // SCRIPTS
        ScriptComponent scriptComp = new ScriptComponent();
        scriptComp.addScript(new BulletGraphicsScript());
        bullet.addComponent(scriptComp, ScriptComponent.ID);

        return bullet;
    }






    private PhysicsComponent buildBody(Entity bullet){
        //Readjust position so it is not positioned according to the middle, but rather the bottom left corner
        position = new Vector2(position.x + size.x, position.y + size.y);

        // Physics
        PhysicsComponent physics = new PhysicsComponent(world, BodyDef.BodyType.DynamicBody, position, size.x, size.y);

        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(physics.getWidth(), physics.getHeight());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;

        fixtureDef.isSensor = true;

        Hitbox hitbox = new Hitbox(Hitbox.Type.Offensive, Constants.ENTITY_TAG_BULLET);
        hitbox.damage = this.dmgComp.getDamage();



        physics.getBody().createFixture(fixtureDef).setUserData(hitbox);
        polyShape.dispose();


        physics.getBody().setUserData(bullet);

        physics.getAcceleration().set(this.speed);


        physics.getBody().setBullet(true);

        physics.setDirection(this.direction);

        physics.getBody().setGravityScale(0);

        return physics;
    }

    /**
     * Adds a tag to the entity
     * @param tag
     * @return this for chaning
     */
    public BulletFactory withTag(String tag) {
        this.tagsComponent.addTag(tag);
        return this;
    }

    /**
     * The direction in which the bullet is going
     * @param direction
     * @return
     */
    public BulletFactory withDirection(PhysicsComponent.Direction direction) {
        this.direction = direction;
        return this;
    }
}

