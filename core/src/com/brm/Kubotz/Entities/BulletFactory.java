package com.brm.Kubotz.Entities;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.BodyDef;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.badlogic.gdx.physics.box2d.PolygonShape;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.TagsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.Kubotz.Component.DamageComponent;
import com.brm.Kubotz.Component.LifespanComponent;
import com.brm.Kubotz.Constants;

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
        this.dmgComp.damage = nbDamage;
        return this;
    }

    /**
     * Sets the knockback when entities collide with the bullet
     * @param knockback
     * @return this for chaining
     */
    public BulletFactory withKnockBack(Vector2 knockback){
        this.dmgComp.knockBack = knockback;
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
        bullet.addComponent(this.buildBody(bullet), PhysicsComponent.ID);

        //Tags Component
        bullet.addComponent(this.tagsComponent, TagsComponent.ID);

        return bullet;
    }






    private PhysicsComponent buildBody(Entity bullet){
        //Readjust position so it is not positioned according to the middle, but rather the bottom left corner
        position = new Vector2(position.x + size.x, position.y + size.y);

        // Physics
        PhysicsComponent physics = new PhysicsComponent(world, BodyDef.BodyType.KinematicBody, position, size.x, size.y);

        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(physics.getWidth(), physics.getHeight());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;

        physics.getBody().createFixture(fixtureDef).setUserData(Constants.ENTITY_TAG_BULLET);
        polyShape.dispose();


        physics.getBody().setUserData(bullet);

        physics.getAcceleration().set(this.speed);


        physics.getBody().setBullet(true);


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
}

