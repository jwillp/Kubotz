package com.brm.GoatEngine;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
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

        // center the camera to the center of the camera viewport
        this.camera.position.set(camera.viewportWidth/2f, camera.viewportHeight/2f, 0);
        this.camera.update();

        this.speed.x = 8.0f;
        this.speed.y = 5.0f;
    }


    /**
     * Updates the camera acording to the target
     * @param targets: The gameObjects having a CameraTargetComponent
     */
    public void update(ArrayList<Entity> targets){
        Vector2 min = new Vector2(2500,2500);
        Vector2 max = new Vector2(-2500,-2500);

        //Find the Min and MAx positions of entity
        for(Entity target : targets){
            PhysicsComponent phys = (PhysicsComponent) target.getComponent(PhysicsComponent.ID);

            min.x = Math.min(min.x, phys.getPosition().x);
            min.y = Math.min(min.y, phys.getPosition().y);

            max.x = Math.max(max.x, phys.getPosition().x);
            max.y = Math.max(max.y, phys.getPosition().y);
        }


        // Find the center point between min and max pos
        float w = Gdx.graphics.getWidth();
        float h = Gdx.graphics.getHeight();
        float width = max.x - min.x;
        float height = (max.y - min.y) * (h/w);
        Vector2 newPos = new Vector2(width/2+min.x, height/2+min.y);


        //Reposition the camera to that center point
        Vector3 cameraPosition = getCamera().position;
        cameraPosition.x += (newPos.x - cameraPosition.x) * speed.x * Gdx.graphics.getDeltaTime();
        cameraPosition.y += (newPos.y - cameraPosition.y) * speed.y * Gdx.graphics.getDeltaTime();


        //ZOOM IN/OUT according to the distance between the two entities
        //Pythagorean distance
        Logger.log(VectorMath.distance(min, max));
        float newZoom = (float) (VectorMath.distance(min, max)/10.0f);
        double speedHyp = Math.sqrt(speed.x*speed.x + speed.y*speed.y);
        camera.zoom += (newZoom-camera.zoom) * speedHyp * Gdx.graphics.getDeltaTime();
        Logger.log(newZoom);



        this.getCamera().update();
    }


    public OrthographicCamera getCamera() {
        return camera;
    }

}
