package com.brm.Kubotz.Systems;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.physics.box2d.Box2DDebugRenderer;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.AI.Pathfinding.PathNode;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.CameraSystem;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.Kubotz.Components.AI.AIComponent;
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

            this.renderPathfinding();
        }

        if(Config.TEXTURE_RENDERING_ENABLED){
            renderTextures();
        }


    }

    
    /**
     * Debug method to render the path and nodes of AI
     */
    private void renderPathfinding() {
		float NODE_SIZE = 0.4f;
    	
    	 //Pathfinding display
        for(Entity e: this.em.getEntitiesWithComponent(AIComponent.ID)){

            AIComponent aiComp = (AIComponent) e.getComponent(AIComponent.ID);

            for(PathNode node: aiComp.getCurrentPath()) {
            	shapeRenderer.setProjectionMatrix(this.getCamera().combined);
            	shapeRenderer.begin(ShapeRenderer.ShapeType.Line);
                if (node.isWalkable)
                	shapeRenderer.setColor(Color.RED);
                if(aiComp.getCurrentPath().indexOf(node) == 0)
                	shapeRenderer.setColor(Color.GREEN);
                if(aiComp.getCurrentPath().indexOf(node) == aiComp.getCurrentPath().size()-1)
                	shapeRenderer.setColor(Color.MAGENTA);
                shapeRenderer.rect(node.position.x, node.position.y, NODE_SIZE, NODE_SIZE);
                shapeRenderer.end();
            }

            // PATH
           for(PathNode node: aiComp.getCurrentPath()){
               if(node.parent != null){
            	   shapeRenderer.begin(ShapeRenderer.ShapeType.Line); // shape type
            	   shapeRenderer.setColor(1, 0, 0, 1); // line's color

                   float offset = NODE_SIZE/2;
                   shapeRenderer.line(
                           node.position.x + offset , node.position.y + offset,
                           node.parent.position.x + offset, node.parent.position.y + offset
                   );
                   shapeRenderer.end();
               }
            }


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
        // FPS
        if(Config.DEBUG_RENDERING_ENABLED) {
            SpriteBatch sb = getSpriteBatch();
            BitmapFont font = new BitmapFont();
            sb.begin();
            font.draw(sb, "FPS: " + Gdx.graphics.getFramesPerSecond(), 0, Gdx.graphics.getHeight());
            /*font.draw(sb, "IS GROUNDED: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).isGrounded(), 0, Gdx.graphics.getHeight() - 30);

            String velText = "Velocity: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getVelocity();
            font.draw(sb, velText, 0, Gdx.graphics.getHeight() - 50);*/
            sb.end();
        }

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
