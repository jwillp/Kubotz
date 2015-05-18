package com.brm.Kubotz.Entities;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Cameras.CameraComponent;
import com.brm.GoatEngine.ECS.Components.TagsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.Entity.EntityManager;

/**
 *
 */
public class CameraFactory extends EntityFactory {


    private CameraComponent cameraComponent;
    private TagsComponent tagsComponent = new TagsComponent();


    public CameraFactory(EntityManager entityManager, int width, int height) {
        super(entityManager);
        this.cameraComponent = new CameraComponent(width, height);
    }

    /**
     * Adds a tag to the tag component
     * @param tag
     * @return this for chaining
     */
    public CameraFactory withTag(String tag){
        this.tagsComponent.addTag(tag);
        return this;
    }


    public CameraFactory withSpeed(Vector2 speed){
        this.cameraComponent.setSpeed(speed);
        return this;
    }

    public CameraFactory withZoomSpeed(float speed){
        this.cameraComponent.setZoomSpeed(speed);
        return this;
    }


    @Override
    public Entity build() {
        Entity camera = new Entity();
        entityManager.registerEntity(camera);

        camera.addComponent(this.cameraComponent, CameraComponent.ID);
        camera.addComponent(this.tagsComponent, TagsComponent.ID);

        return camera;
    }
}
