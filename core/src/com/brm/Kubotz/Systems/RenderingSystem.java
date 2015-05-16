package com.brm.Kubotz.Systems;


import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.physics.box2d.Box2DDebugRenderer;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.CameraSystem;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Renderers.CameraDebugRenderer;

/**
 * Responsible for displaying all visual elements on screen
 */
public class RenderingSystem extends EntitySystem {

    private CameraSystem cameraSystem;
    private SpriteBatch spriteBatch = new SpriteBatch();
    private ShapeRenderer shapeRenderer = new ShapeRenderer();
    private Box2DDebugRenderer debugRenderer;

    public RenderingSystem(EntityManager em) {
        super(em);
        this.cameraSystem = new CameraSystem(em);
        debugRenderer = new Box2DDebugRenderer();
    }

    @Override
    public void init() {

    }

    @Override
    public void update(float dt){
        this.cameraSystem.update(dt);
    }






    public void render(){
        World world = getSystemManager().getSystem(PhysicsSystem.class).getWorld();
        if(Config.DEBUG_RENDERING_ENABLED) {
            this.renderDebug(world);
        }

        if(Config.TEXTURE_RENDERING_ENABLED){
            renderTextures();
        }


    }

    /**
     * Renders the texture of all the entities
     */
    private void renderTextures(){

    }




    /**
     * Renders all the debug graphics
     * @param world
     */
    private void renderDebug(World world){

        this.spriteBatch.begin();
        debugRenderer.render(world, cameraSystem.getMainCamera().combined);
        this.spriteBatch.end();






        /** CAMERA DEBUG */
        CameraDebugRenderer cdr = new CameraDebugRenderer(cameraSystem.getMainCamera(), shapeRenderer);
        cdr.render();


        /** FPS **/





    }



    public OrthographicCamera getCamera(){
        return this.cameraSystem.getMainCamera();
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
