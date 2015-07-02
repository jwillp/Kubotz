import com.brm.GoatEngine.ECS.core.Entity
import com.brm.GoatEngine.ECS.core.EntityManager
import com.brm.GoatEngine.GoatEngine
import com.brm.GoatEngine.Konsole.ConsoleCommandExecutor
import com.brm.GoatEngine.ScriptingEngine.EntityScript



class CustomConsoleScript extends EntityScript{


    /**
     * Custom Console Commands
     */
    class GameCommandExecutor extends ConsoleCommandExecutor{

        /**
         * Kill all entities (Just a Test)
         */
        public void killAll(){
            GoatEngine.gameScreenManager.currentScreen.getEntityManager().clear();
        }

    }


    public void onInit(Entity entity, EntityManager entityManager){
        GoatEngine.console.setCommandExecutor(new GameCommandExecutor())
    }

    /**
     * Called every frame
     * @param entity the entity to update with the script
     */
    @Override
    void onUpdate(Entity entity, EntityManager entityManager) {

    }
}