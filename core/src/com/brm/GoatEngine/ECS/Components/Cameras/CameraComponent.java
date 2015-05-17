package com.brm.GoatEngine.ECS.Components.Cameras;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.EntityComponent;

/**
 * Used by entities willing to be a camera
 */
public class CameraComponent extends EntityComponent {
    public final static String ID = "CAMERA_COMPONENT";
    private OrthographicCamera camera;

    //For Smooth camera movement(delayed camera movement, (the higher the most direct and quick))
    private Vector2 speed = new Vector2(8.0f, 5.0f);

    private float zoomSpeed = -1; //The system (-1 one values means the system will decide by itself)



    //Zoom properties
    private float minimumZoom = 0.3f; //The minimum value the camera can Zoom In/Out ==> 1 = default Viewport width value (no Zoom)
    private float maximumZoom = Float.MAX_VALUE; //The maximum value the camera can Zoom In/Out





    /**
     * @param width width of the area to cover in game units
     * @param height height of the area to cover in game units
     */
    public CameraComponent(int width, int height){
        float w = Gdx.graphics.getWidth();
        float h = Gdx.graphics.getHeight();

        this.camera = new OrthographicCamera(width, height * (h/w)); // in game units

        // center the camera to the center of the camera viewport
        this.camera.position.set(camera.viewportWidth/2f, camera.viewportHeight/2f, 0);
        this.camera.update();
    }


    public OrthographicCamera getCamera() {
        return camera;
    }

    public void setCamera(OrthographicCamera camera) {
        this.camera = camera;
    }

    public Vector2 getSpeed() {
        return speed;
    }

    public void setSpeed(Vector2 speed) {
        this.speed = speed;
    }

    public float getZoomSpeed() {
        return zoomSpeed;
    }

    public void setZoomSpeed(float zoomSpeed) {
        this.zoomSpeed = zoomSpeed;
    }

    public float getMinimumZoom() {
        return minimumZoom;
    }

    public void setMinimumZoom(float minimumZoom) {
        this.minimumZoom = minimumZoom;
    }

    public float getMaximumZoom() {
        return maximumZoom;
    }

    public void setMaximumZoom(float maximumZoom) {
        this.maximumZoom = maximumZoom;
    }
}
