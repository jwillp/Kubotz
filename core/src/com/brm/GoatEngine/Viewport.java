package com.brm.GoatEngine;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;

/**
 * Used to display the World
 * Dependency = LibGDX
 * It manages the Orthographic Camera
 */
public class Viewport {

    private OrthographicCamera camera;
    private float leftHotspot   = 0.0f;   // Minimum X
    private float rightHotspot  = 0.0f;   // Maximum X
    private float topHostpot    = 0.0f;   // Maximum Y
    private float bottomHotspot = 0.0f;   // Minimum Y

    //For Smooth camera movement(delayed camera movement, (the higher the most direct))
    private Vector2 speed = new Vector2();

    /**
     * @param width width of the area to cover
     * @param height height of the area to cover
     */
    public Viewport(int width, int height){

        float w = Gdx.graphics.getWidth();
        float h = Gdx.graphics.getHeight();

        this.camera = new OrthographicCamera(width, height * (h/w)); // in game units

        // center the camera to the center of the viewport
        this.camera.position.set(camera.viewportWidth/2, camera.viewportHeight/2, 0);
        this.camera.update();


        this.speed.x = 3.0f;
        this.speed.y = 8.0f;

    }


    /**
     * Updates the camera acording to the target
     * @param target: The gameObject to follow
     */
    public void update(Entity target){
        PhysicsComponent phys = (PhysicsComponent) target.getComponent(PhysicsComponent.ID);

        Vector3 cameraPosition = getCamera().position;
        cameraPosition.x += (phys.getPosition().x - cameraPosition.x) * speed.x * Gdx.graphics.getDeltaTime();
        cameraPosition.y += (phys.getPosition().y - cameraPosition.y) * speed.y * Gdx.graphics.getDeltaTime();

        this.getCamera().update();
    }


    public OrthographicCamera getCamera() {
        return camera;
    }

    public void setCamera(OrthographicCamera camera) {
        this.camera = camera;
    }
}
