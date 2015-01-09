package com.brm.GoatEngine;

import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.Kubotz.Properties.PhysicsProperty;

/**
 * Used to display the World
 * It manages the Orthographic Camera
 */
public class Viewport {

    private OrthographicCamera camera;
    private float leftHotspot   = 0.0f;   // Minimum X
    private float rightHotspot  = 0.0f;   // Maximum X
    private float topHostpot    = 0.0f;   // Maximum Y
    private float bottomHotspot = 0.0f;   // Minimum Y


    private Vector2 speed = new Vector2();


    /**
     * @param width width of the area to cover
     * @param height height of the area to cover
     */
    public Viewport(int width, int height){

        this.camera = new OrthographicCamera(width, height); // in game units
        // center the camera to the center of the viewport
        this.camera.position.set(camera.viewportWidth/2, camera.viewportHeight/2, 0);
        this.camera.update();

    }


    /**
     * Updates the camera acording to the target
     * @param target: The gameObject to follow
     */
    private void update(Entity target){
        PhysicsProperty phys = (PhysicsProperty) target.getProperty(PhysicsProperty.ID);


        // TODO handle Movement
        this.camera.position.set(phys.getPosition().x, phys.getPosition().y, 0);


        this.getCamera().update();
    }


    public OrthographicCamera getCamera() {
        return camera;
    }

    public void setCamera(OrthographicCamera camera) {
        this.camera = camera;
    }
}
