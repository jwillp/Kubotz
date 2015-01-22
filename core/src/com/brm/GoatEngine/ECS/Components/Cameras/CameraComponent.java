package com.brm.GoatEngine.ECS.Components.Cameras;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;

/**
 * Used by entities willing to be a camera
 */
public class CameraComponent extends Component {
    public final static String ID = "CAMERA_COMPONENT";
    public OrthographicCamera camera;

    //For Smooth camera movement(delayed camera movement, (the higher the most direct and quick))
    public Vector2 speed = new Vector2(8.0f, 5.0f);

    public float zoomSpeed = -1; //The system



    //Zoom properties
    public float minimumZoom = 0.5f; //The minimum value the camera can Zoom In/Out ==> 1 = default Viewport width value (no Zoom)
    public float maximumZoom = 1.5f; //The maximum value the camera can Zoom In/Out





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


}
