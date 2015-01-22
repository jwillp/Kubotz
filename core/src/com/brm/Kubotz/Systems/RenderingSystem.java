package com.brm.Kubotz.Systems;


import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.physics.box2d.Box2DDebugRenderer;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.ECS.Components.Cameras.CameraComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.CameraSystem;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Entities.CameraBuilder;
import com.brm.Kubotz.Renderers.CameraDebugRenderer;

/**
 * Responsible for displaying all visual elements on screen
 */
public class RenderingSystem extends EntitySystem {

    private CameraSystem cameraSystem;
    private SpriteBatch spriteBatch = new SpriteBatch();
    private ShapeRenderer shapeRenderer = new ShapeRenderer();
    private Box2DDebugRenderer debugRenderer;
    private Entity camera;


    public RenderingSystem(EntityManager em) {
        super(em);
    }

    public void init(){
        this.cameraSystem = new CameraSystem(em);

        //Creation of a main Camera
        this.camera = new CameraBuilder(this.em, 30,30)
                .withTag("mainCamera")
                .build();
        debugRenderer = new Box2DDebugRenderer();
    }

    public void update(){
        this.cameraSystem.update();
    }






    public void render(World world){
        /*if(Config.DEBUG_RENDERING_ENABLED){
            for(Entity e: this.em.getEntities()){
                BoundingBoxRenderer br = new BoundingBoxRenderer(e, getShapeRenderer());
                br.draw(this.viewport.getCamera());
            }
        }*/
        if(Config.DEBUG_RENDERING_ENABLED) {

            CameraComponent camComp = (CameraComponent) this.camera.getComponent(CameraComponent.ID);

            this.spriteBatch.begin();
            debugRenderer.render(world, camComp.camera.combined);
            this.spriteBatch.end();


            /** CAMERA DEBUG */
            CameraDebugRenderer cdr = new CameraDebugRenderer(camComp.camera, shapeRenderer);
            cdr.render();

        }

    }


    public SpriteBatch getSpriteBatch() {
        return spriteBatch;
    }

    public void setSpriteBatch(SpriteBatch spriteBatch) {
        this.spriteBatch = spriteBatch;
    }

    public ShapeRenderer getShapeRenderer() {
        return shapeRenderer;
    }

    public void setShapeRenderer(ShapeRenderer shapeRenderer) {
        this.shapeRenderer = shapeRenderer;
    }
}
