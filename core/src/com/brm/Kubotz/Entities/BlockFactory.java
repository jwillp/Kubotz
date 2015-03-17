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
import com.brm.Kubotz.Constants;

/**
 * Used to create block entities
 */
public class BlockFactory extends EntityFactory {

    private World world;
    private Vector2 position = new Vector2(0,0);
    private Vector2 size = new Vector2(1,1);
    private TagsComponent tagsComponent = new TagsComponent();

    public BlockFactory(EntityManager entityManager, World world, Vector2 position){
        super(entityManager);
        this.world = world;
        this.position = position;

    }

    /**
     * Allows to set the size of the generated Block
     * @return BlockBuilder for chaining
     */
    public BlockFactory withSize(float width, float height){
        size.x = width/2; //Divide by half because box2D width equals half of shape
        size.y = height/2;
        return this;
    }



    @Override
    public Entity build() {
        Entity block = new Entity();
        entityManager.registerEntity(block);



        //Readjust position so it is not positioned according to the middle, but rather the bottom left corner
        position = new Vector2(position.x + size.x, position.y + size.y);

        // Physics
        PhysicsComponent physics = new PhysicsComponent(world, BodyDef.BodyType.StaticBody, position, size.x, size.y);

        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(physics.getWidth(), physics.getHeight());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;

        physics.getBody().createFixture(fixtureDef);
        polyShape.dispose();

        physics.getBody().setUserData(block);



        //Tags

        block.addComponent(physics, PhysicsComponent.ID);
        block.addComponent(tagsComponent, TagsComponent.ID);

        return block;
    }

    /**
     * Adds a tag
     * @param tag
     * @return this for chaining
     */
    public BlockFactory withTag(String tag) {
        tagsComponent.addTag(tag);
        return this;
    }




}
