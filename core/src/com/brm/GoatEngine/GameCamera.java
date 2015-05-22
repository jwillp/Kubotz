package com.brm.GoatEngine;

import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.Vector2;

/**
 * A Camera with speed of movement and of zoom
 */
public class GameCamera extends OrthographicCamera {


    //For Smooth camera movement(delayed camera movement, (the higher the most direct and quick))
    private Vector2 speed = new Vector2(8.0f, 5.0f);

    private float zoomSpeed = -1; //The zoom speed (-1 one values means the system will decide by itself)

    //Zoom properties
    private float minimumZoom = 0.3f; //The minimum value the camera can Zoom In/Out ==> 1 = default Viewport width value (no Zoom)
    private float maximumZoom = Float.MAX_VALUE; //The maximum value the camera can Zoom In/Out




    public GameCamera(){
        super();
    }

    public GameCamera(float viewportWidth, float viewportHeight){
        super(viewportWidth, viewportHeight);
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
