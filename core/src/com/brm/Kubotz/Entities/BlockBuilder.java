package com.brm.Kubotz.Entities;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.BodyDef;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.badlogic.gdx.physics.box2d.PolygonShape;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.TagsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityBuilder;
import com.brm.GoatEngine.ECS.EntityManager;

/**
 * Used to create block entities
 */
public class BlockBuilder extends EntityBuilder {

    private World world;
    private Vector2 position = new Vector2(0,0);
    private Vector2 size = new Vector2(1,1);

    public BlockBuilder(EntityManager entityManager, World world, Vector2 position){
        super(entityManager);
        this.world = world;
        this.position = position;

    }

    /**
     * Allows to set the size of the generated Block
     * @return BlockBuilder for chaining
     */
    public BlockBuilder withSize(float witdh, float height){
        size.x = witdh;
        size.y = height;
        return this;
    }



    @Override
    public Entity build() {
        Entity block = new Entity();
        entityManager.registerEntity(block);


        //Readjust position so it is not positioned according to the middle, but rather the bottom left corner
        position = new Vector2(position.x - size.x/2, position.y - size.y/2);





        // Physics
        PhysicsComponent physics = new PhysicsComponent(world, BodyDef.BodyType.StaticBody,
                                                        position.x, position.y, size.x, size.y);

        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(physics.getWidth(), physics.getHeight());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;

        physics.getBody().createFixture(fixtureDef);
        polyShape.dispose();

        physics.getBody().setUserData(block);



        //Tags
        TagsComponent tagComp = new TagsComponent();
        tagComp.addTag("block");


        block.addComponent(physics, PhysicsComponent.ID);
        block.addComponent(tagComp, TagsComponent.ID);

        return block;
    }


}
