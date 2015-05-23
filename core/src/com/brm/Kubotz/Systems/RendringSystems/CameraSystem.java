package com.brm.Kubotz.Systems.RendringSystems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.utils.viewport.FillViewport;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import com.brm.GoatEngine.ECS.Components.Cameras.CameraTargetComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.GameCamera;
import com.brm.GoatEngine.Utils.GameMath;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Config;

/**
 * A system handling all cameras and their movements
 * The camera will always try to display every entity
 * with a CameraTargetComponent
 */
public class CameraSystem extends EntitySystem {

    private final GameCamera mainCamera;
    private final Viewport viewport;
    private float maxX, maxY;

    public CameraSystem(EntityManager em) {
        super(em);
        maxX = 40;
        maxY = 24;
        //Creation of a main Camera
        this.mainCamera = new GameCamera();
        this.viewport = new FitViewport(40, 24, mainCamera);
    }

    @Override
    public void init() {}



    @Override
    public void update(float dt){

        //UPDATE THE CAMERA
        Vector2 leftMost = new Vector2(Integer.MAX_VALUE,Float.MAX_VALUE);
        Vector2 rightMost = new Vector2(Integer.MIN_VALUE, Integer.MIN_VALUE);

        //Find the left most entity and the right most entity
        for(Entity target : this.em.getEntitiesWithComponent(CameraTargetComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent) target.getComponent(PhysicsComponent.ID);

            leftMost.x = java.lang.Math.min(leftMost.x, phys.getPosition().x);
            leftMost.y = java.lang.Math.min(leftMost.y, phys.getPosition().y);

            rightMost.x = java.lang.Math.max(rightMost.x, phys.getPosition().x);
            rightMost.y = java.lang.Math.max(rightMost.y, phys.getPosition().y);
        }

        //ZOOM IN/OUT according to the distance between the two entities
        updateZoom(leftMost, rightMost);

        // Find the center point between between the two entities
        updatePosition(leftMost, rightMost);

        //Make sure the camera does not display anything outside the world
        updateBoundaries();


        //Update the camera
        mainCamera.update();

        viewport.update(Gdx.graphics.getWidth(), Gdx.graphics.getHeight());


    }



    /**
     * Updates the position of the camera according to the leftMost entity (minPosition)
     * And the right most entity (maxPosition) so it is placed between to two positions
     * @param leftMost The left most object's position
     * @param rightMost The right most object's position
     */
    private void updatePosition(Vector2 leftMost, Vector2 rightMost){
        if(mainCamera.isLocked()){
            return;
        }
        // Find the center point between leftMost and rightMost pos
        float centerX = (leftMost.x + rightMost.x)*0.5f;
        float centerY = (leftMost.y + rightMost.y)*0.5f;


        //All is good let's lerp for smooth cam movements
        float lerpProgress = mainCamera.getSpeed().x * Gdx.graphics.getDeltaTime();
        if(!mainCamera.isXAxisLocked()){
            mainCamera.position.x = MathUtils.lerp( mainCamera.position.x, centerX, lerpProgress);
        }
        if(!mainCamera.isYAxisLocked()){
            mainCamera.position.y = MathUtils.lerp( mainCamera.position.y, centerY, lerpProgress);
        }



    }




    /**
     * Updates the Zoom of the camera according to the leftMost entity (minPosition)
     * And the right most entity (maxPosition) so both position are visible to the camera
     * @param leftMost
     * @param rightMost
     */
    private void updateZoom(Vector2 leftMost, Vector2 rightMost){

        //Pythagorean distance
        float zoomFactor = (float)(GameMath.distance(leftMost, rightMost)/10.0f); //TODO 10? what was I thinking?
        zoomFactor = MathUtils.clamp(zoomFactor, mainCamera.getMinimumZoom(), mainCamera.getMaximumZoom());

        //if the camera has no particular zoom speed, we'll define one based on camera speed
        float zoomSpeed = mainCamera.getZoomSpeed() == -1 ? mainCamera.getSpeed().len() : mainCamera.getZoomSpeed();

        //LERP for smooth zoom
        mainCamera.zoom = MathUtils.lerp(mainCamera.zoom, zoomFactor, zoomSpeed * Gdx.graphics.getDeltaTime());
     }


    /**
     * Make sure the Viewport of the camera is always within the boundaries
     * So moves it and zoom in/out in order for it work
     */
    private void updateBoundaries(){
        // Now We need to readjust the position of the camera (so it doest show the outside of the world)
        float visibleX = mainCamera.viewportWidth *  mainCamera.zoom; //The number of tiles visible in X at the moment
        float visibleY = mainCamera.viewportHeight *  mainCamera.zoom;//The number of tiles visible in Y at the moment
        float posY = mainCamera.position.y;
        float posX = mainCamera.position.x;


        // First try to move it out of the bounds
        mainCamera.position.x = MathUtils.clamp(mainCamera.position.x, visibleX/2, this.maxX/2 - visibleX/2);
        mainCamera.position.y = MathUtils.clamp(mainCamera.position.y, visibleY/2, this.maxY/2 - visibleY/2);


    }




    /**
     * Used to make the camera shake.
     * Process all entities and finds the ones Shaking
     */
    private void cameraShake(){
        //TODO Shake that CAMERA!
    }





    /**
     * Returns the orthographic camera
     * @return
     */
    public OrthographicCamera getMainCamera() {
        return mainCamera;
    }
}
