package com.brm.GoatEngine.ECS.Systems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;
import com.brm.GoatEngine.ECS.Components.Cameras.CameraComponent;
import com.brm.GoatEngine.ECS.Components.Cameras.CameraTargetComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.Utils.GameMath;
import com.brm.Kubotz.Entities.CameraFactory;

/**
 * A system handling all cameras and their movements
 */
public class CameraSystem extends EntitySystem {

    private Entity mainCamera;

    public CameraSystem(EntityManager em) {
        super(em);
        //Creation of a main Camera
        this.mainCamera = new CameraFactory(this.em, 40,40)
                .withTag("mainCamera")
                .build();

    }

    @Override
    public void init() {}



    @Override
    public void update(float dt){
        for(Entity camEntity: this.em.getEntitiesWithComponent(CameraComponent.ID)){
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
            updatePosition(camEntity, leftMost, rightMost);

            //ZOOM IN/OUT according to the distance between the two entities
            updateZoom(camEntity, leftMost, rightMost);

            //Update the camera
            CameraComponent camComp = (CameraComponent)camEntity.getComponent(CameraComponent.ID);
            camComp.getCamera().update();
        }
    }



    /**
     * Updates the position of the camera according to the leftMost entity (minPosition)
     * And the right most entity (maxPosition) so it is placed between to two positions
     * @param leftMost The left most object's position
     * @param rightMost The right most object's position
     */
    private void updatePosition(Entity cam, Vector2 leftMost, Vector2 rightMost){
        CameraComponent camComp = (CameraComponent)cam.getComponent(CameraComponent.ID);

        // Find the center point between leftMost and rightMost pos
        float w = Gdx.graphics.getWidth();
        float h = Gdx.graphics.getHeight();
        float width = rightMost.x - leftMost.x;
        float height = (rightMost.y - leftMost.y) * (h/w);
        Vector2 newPos = new Vector2(width/2+leftMost.x, height/2+leftMost.y);

        //Reposition the camera to that center point
        Vector3 cameraPosition = camComp.getCamera().position;
        cameraPosition.x += (newPos.x - cameraPosition.x) * camComp.getSpeed().x * Gdx.graphics.getDeltaTime();
        cameraPosition.y += (newPos.y - cameraPosition.y) * camComp.getSpeed().y * Gdx.graphics.getDeltaTime();
    }




    /**
     * Updates the Zoom of the camera according to the leftMost entity (minPosition)
     * And the right most entity (maxPosition) so both position are visible to the camera
     * @param cam an entity having a camera component
     * @param leftMost
     * @param rightMost
     */
    private void updateZoom(Entity cam, Vector2 leftMost, Vector2 rightMost){
        CameraComponent camComp = (CameraComponent)cam.getComponent(CameraComponent.ID);
        //Pythagorean distance
        float zoomScale = (float) (GameMath.distance(leftMost, rightMost)/10.0f);
        double zoomSpeed;

        zoomSpeed = camComp.getZoomSpeed() == -1 ? camComp.getSpeed().len() : camComp.getZoomSpeed();


        //Zoom according to distance
        camComp.getCamera().zoom += (java.lang.Math.min(java.lang.Math.max(zoomScale, camComp.getMinimumZoom()), camComp.getMaximumZoom()) - camComp.getCamera().zoom)
                * zoomSpeed * Gdx.graphics.getDeltaTime();

     }

    /**
     * Returns the orthographic camera
     * @return
     */
    public OrthographicCamera getMainCamera() {
        CameraComponent camComp = (CameraComponent) mainCamera.getComponent(CameraComponent.ID);
        return camComp.getCamera();
    }
}
