package com.brm.GoatEngine;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.Math.VectorMath;
import com.brm.GoatEngine.Utils.Logger;

import java.util.ArrayList;

/**
 * Used to display the World
 * Dependency = LibGDX
 * It manages the Orthographic Camera
 */
public class Viewport {

    private OrthographicCamera camera;


    //For Smooth camera movement(delayed camera movement, (the higher the most direct and quick))
    private Vector2 speed = new Vector2(8.0f, 5.0f);

    //Zoom parameter
    float minimumZoom = 0.5f; //The minimum value the camera can Zoom In/Out ==> 1 = default Viewport width value (no Zoom)
    float maximumZoom = 1.5f; //The minimum value the camera can Zoom In/Out


    /**
     * @param width width of the area to cover
     * @param height height of the area to cover
     */
    public Viewport(int width, int height){

        float w = Gdx.graphics.getWidth();
        float h = Gdx.graphics.getHeight();

        this.camera = new OrthographicCamera(width, height * (h/w)); // in game units

        // center the camera to the center of the camera viewport
        this.camera.position.set(camera.viewportWidth/2f, camera.viewportHeight/2f, 0);
        this.camera.update();

    }


    /**
     * Updates the camera acording to the target
     * @param targets: The gameObjects having a CameraTargetComponent
     */
    public void update(ArrayList<Entity> targets){


        Vector2 leftMost = new Vector2(2500,2500);
        Vector2 rightMost = new Vector2(-2500,-2500);

        //Find the left most entity and the right most entity
        for(Entity target : targets){
            PhysicsComponent phys = (PhysicsComponent) target.getComponent(PhysicsComponent.ID);

            leftMost.x = Math.min(leftMost.x, phys.getPosition().x);
            leftMost.y = Math.min(leftMost.y, phys.getPosition().y);

            rightMost.x = Math.max(rightMost.x, phys.getPosition().x);
            rightMost.y = Math.max(rightMost.y, phys.getPosition().y);
        }

        // Find the center point between between the two entities
        updatePosition(leftMost, rightMost);

        //ZOOM IN/OUT according to the distance between the two entities
        updateZoom(leftMost, rightMost);

        this.getCamera().update();
    }

    /**
     * Updates the position of the camera according to the leftMost entity (minPosition)
     * And the right most entity (maxPosition) so it is placed between to two positions
     * @param leftMost
     * @param rightMost
     */
    public void updatePosition(Vector2 leftMost, Vector2 rightMost){
        // Find the center point between leftMost and rightMost pos
        Vector3 oldPos = camera.position;
        float w = Gdx.graphics.getWidth();
        float h = Gdx.graphics.getHeight();
        float width = rightMost.x - leftMost.x;
        float height = (rightMost.y - leftMost.y) * (h/w);
        Vector2 newPos = new Vector2(width/2+leftMost.x, height/2+leftMost.y);

        //Reposition the camera to that center point
        Vector3 cameraPosition = getCamera().position;
        cameraPosition.x += (newPos.x - cameraPosition.x) * speed.x * Gdx.graphics.getDeltaTime();
        cameraPosition.y += (newPos.y - cameraPosition.y) * speed.y * Gdx.graphics.getDeltaTime();


        // TODO Check camera position limits of the map and rapply pos = old posIf necesary




    }


     /**
     * Updates the Zoom of the camera according to the leftMost entity (minPosition)
     * And the right most entity (maxPosition) so both position are visible to the camera
     * @param leftMost
     * @param rightMost
     */
    public void updateZoom(Vector2 leftMost, Vector2 rightMost){
        //Pythagorean distance
        float zoomScale = (float) (VectorMath.distance(leftMost, rightMost)/10.0f);
        double zoomSpeed = Math.sqrt(speed.x*speed.x + speed.y * speed.y);
        camera.zoom += (Math.min(Math.max(zoomScale, this.minimumZoom), this.maximumZoom ) - camera.zoom) * zoomSpeed * Gdx.graphics.getDeltaTime();
    }


    public OrthographicCamera getCamera() {
        return camera;
    }

}
