package com.brm.Kubotz.Systems.RendringSystems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
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

/**
 * A system handling all cameras and their movements
 * The camera will always try to display every entity
 * with a CameraTargetComponent
 */
public class CameraSystem extends EntitySystem {

    private final GameCamera mainCamera;
    private final Viewport viewport;

    public CameraSystem(EntityManager em) {
        super(em);
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

        // Find the center point between between the two entities
        updatePosition(leftMost, rightMost);

        //ZOOM IN/OUT according to the distance between the two entities
        updateZoom(leftMost, rightMost);

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


        // Find the center point between leftMost and rightMost pos
        float w = Gdx.graphics.getWidth();
        float h = Gdx.graphics.getHeight();
        float width = rightMost.x - leftMost.x;
        float height = (rightMost.y - leftMost.y) * (h/w);
        Vector2 newPos = new Vector2(width/2+leftMost.x, height/2+leftMost.y);

        //Reposition the camera to that center point
        Vector3 cameraPosition = mainCamera.position;
        cameraPosition.x += (newPos.x - cameraPosition.x) * mainCamera.getSpeed().x * Gdx.graphics.getDeltaTime();
        cameraPosition.y += (newPos.y - cameraPosition.y) * mainCamera.getSpeed().y * Gdx.graphics.getDeltaTime();
    }




    /**
     * Updates the Zoom of the camera according to the leftMost entity (minPosition)
     * And the right most entity (maxPosition) so both position are visible to the camera
     * @param leftMost
     * @param rightMost
     */
    private void updateZoom(Vector2 leftMost, Vector2 rightMost){

        //Pythagorean distance
        float zoomScale = (float) (GameMath.distance(leftMost, rightMost)/10.0f);
        double zoomSpeed;

        zoomSpeed = mainCamera.getZoomSpeed() == -1 ? mainCamera.getSpeed().len() : mainCamera.getZoomSpeed();


        //Zoom according to distance
        mainCamera.zoom += (java.lang.Math.min(java.lang.Math.max(zoomScale, mainCamera.getMinimumZoom()), mainCamera.getMaximumZoom()) - mainCamera.zoom)
                * zoomSpeed * Gdx.graphics.getDeltaTime();

     }

    /**
     * Returns the orthographic camera
     * @return
     */
    public OrthographicCamera getMainCamera() {
        return mainCamera;
    }
}
